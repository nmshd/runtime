import { EventBus } from "@js-soft/ts-utils";
import { DeleteAttributeRequestItem, RelationshipTemplateContent, Request, RequestItem, RequestItemGroup, Response, ResponseItem, ResponseItemGroup } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreId } from "@nmshd/core-types";
import { Message, PeerDeletionStatus, Relationship, RelationshipStatus, RelationshipTemplate, SynchronizedCollection, TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../../consumption/ConsumptionControllerName";
import { ConsumptionCoreErrors } from "../../../consumption/ConsumptionCoreErrors";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../../consumption/ConsumptionIds";
import { ForwardedAttributeDeletionInfo, ForwardedAttributeDeletionStatus, OwnIdentityAttribute, OwnRelationshipAttribute, PeerRelationshipAttribute } from "../../attributes";
import { ValidationResult } from "../../common/ValidationResult";
import { OutgoingRequestCreatedAndCompletedEvent, OutgoingRequestCreatedEvent, OutgoingRequestStatusChangedEvent } from "../events";
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry";
import { LocalRequest, LocalRequestSource } from "../local/LocalRequest";
import { LocalRequestStatus } from "../local/LocalRequestStatus";
import { LocalResponse } from "../local/LocalResponse";
import { validateKeyUniquenessOfRelationshipAttributesWithinOutgoingRequest } from "../utility/validateRelationshipAttributesWithinRequest";
import { CompleteOutgoingRequestParameters, ICompleteOutgoingRequestParameters } from "./completeOutgoingRequest/CompleteOutgoingRequestParameters";
import {
    CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters,
    ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
} from "./createAndCompleteFromRelationshipTemplateResponse/CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters";
import { CanCreateOutgoingRequestParameters, ICanCreateOutgoingRequestParameters } from "./createOutgoingRequest/CanCreateOutgoingRequestParameters";
import { CreateOutgoingRequestParameters, ICreateOutgoingRequestParameters } from "./createOutgoingRequest/CreateOutgoingRequestParameters";
import { ISentOutgoingRequestParameters, SentOutgoingRequestParameters } from "./sentOutgoingRequest/SentOutgoingRequestParameters";

export class OutgoingRequestsController extends ConsumptionBaseController {
    public constructor(
        private readonly localRequests: SynchronizedCollection,
        private readonly processorRegistry: RequestItemProcessorRegistry,
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress },
        private readonly relationshipResolver: {
            getRelationshipToIdentity(id: CoreAddress): Promise<Relationship | undefined>;
        }
    ) {
        super(ConsumptionControllerName.RequestsController, parent);
    }

    public async canCreate(params: ICanCreateOutgoingRequestParameters): Promise<ValidationResult> {
        const parsedParams = CanCreateOutgoingRequestParameters.from(params);

        if (parsedParams.peer?.equals(this.identity.address)) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.cannotShareRequestWithYourself());
        }

        if (parsedParams.content.expiresAt?.isBefore(CoreDate.utc())) {
            return ValidationResult.error(ConsumptionCoreErrors.requests.cannotCreateRequestWithExpirationDateInPast());
        }

        if (parsedParams.peer) {
            const relationship = await this.relationshipResolver.getRelationshipToIdentity(parsedParams.peer);

            // there should at minimum be a pending Relationship to the peer
            if (!relationship) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.missingRelationship(`You cannot create a request to '${parsedParams.peer.toString()}' since you are not in a relationship.`)
                );
            }

            if (!(relationship.status === RelationshipStatus.Pending || relationship.status === RelationshipStatus.Active)) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.wrongRelationshipStatus(
                        `You cannot create a request to '${parsedParams.peer.toString()}' since the relationship is in status '${relationship.status}'.`
                    )
                );
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.ToBeDeleted) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.peerIsInDeletion(`You cannot create a Request to peer '${parsedParams.peer.toString()}' since the peer is in deletion.`)
                );
            }

            if (relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted) {
                return ValidationResult.error(
                    ConsumptionCoreErrors.requests.peerIsDeleted(`You cannot create a Request to peer '${parsedParams.peer.toString()}' since the peer is deleted.`)
                );
            }
        }

        const innerResults = await this.canCreateItems(parsedParams.content, parsedParams.peer);
        const result = ValidationResult.fromItems(innerResults);

        if (result.isError()) return result;

        const keyUniquenessValidationResult = validateKeyUniquenessOfRelationshipAttributesWithinOutgoingRequest(parsedParams.content.items, parsedParams.peer);
        if (keyUniquenessValidationResult.isError()) return keyUniquenessValidationResult;

        return result;
    }

    private async canCreateItems(request: Request, recipient?: CoreAddress) {
        const results: ValidationResult[] = [];

        for (const requestItem of request.items) {
            if (requestItem instanceof RequestItem) {
                const canCreateItem = await this.canCreateItem(requestItem, request, recipient);
                results.push(canCreateItem);
            } else {
                const result = await this.canCreateItemGroup(requestItem, request, recipient);
                results.push(result);
            }
        }

        return results;
    }

    private async canCreateItem(requestItem: RequestItem, request: Request, recipient?: CoreAddress) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem);
        return await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);
    }

    private async canCreateItemGroup(requestItem: RequestItemGroup, request: Request, recipient?: CoreAddress) {
        const innerResults: ValidationResult[] = [];

        for (const innerRequestItem of requestItem.items) {
            const canCreateItem = await this.canCreateItem(innerRequestItem, request, recipient);
            innerResults.push(canCreateItem);
        }

        const result = ValidationResult.fromItems(innerResults);

        return result;
    }

    public async create(params: ICreateOutgoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CreateOutgoingRequestParameters.from(params);

        const id = await ConsumptionIds.request.generate();
        parsedParams.content.id = id;
        const request = await this._create(id, parsedParams.content, parsedParams.peer);

        this.eventBus.publish(new OutgoingRequestCreatedEvent(this.identity.address.toString(), request));

        return request;
    }

    private async _create(id: CoreId, content: Request, peer: CoreAddress) {
        const canCreateResult = await this.canCreate({ content, peer });

        if (canCreateResult.isError()) {
            const error = ConsumptionCoreErrors.requests.inheritedFromItem("Some child items have errors. Call 'canCreate' to get more information.");
            if (canCreateResult.error.equals(error)) throw error;

            throw canCreateResult.error;
        }

        const request = LocalRequest.from({
            id: id,
            content,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: peer,
            status: LocalRequestStatus.Draft,
            statusLog: []
        });

        await this.localRequests.create(request);
        return request;
    }

    public async createAndCompleteFromRelationshipTemplateResponse(params: ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters): Promise<LocalRequest> {
        const parsedParams = CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters.from(params);

        const peer = parsedParams.responseSource instanceof Relationship ? parsedParams.responseSource.peer.address : parsedParams.responseSource.createdBy;
        const response = parsedParams.response;
        const requestId = response.requestId;

        const templateContent = parsedParams.template.content;
        if (!(templateContent instanceof RelationshipTemplateContent)) {
            throw new ConsumptionError("The content of the template is not of type RelationshipTemplateContent hence it's not possible to create a request from it.");
        }

        // checking for an active relationship is not secure as in the meantime the relationship could have been accepted
        const isFromNewRelationship = parsedParams.responseSource instanceof Relationship && parsedParams.responseSource.auditLog.length === 1;

        const requestContent = isFromNewRelationship ? templateContent.onNewRelationship : templateContent.onExistingRelationship;

        if (!requestContent) {
            throw new ConsumptionError(
                "The request content is undefined. This can happen when there were invalid params when executing createAndCompleteFromRelationshipTemplateResponse."
            );
        }

        await this._create(requestId, requestContent, peer);
        await this._sent(requestId, parsedParams.template);

        const request = await this._complete(requestId, parsedParams.responseSource, response);
        this.eventBus.publish(new OutgoingRequestCreatedAndCompletedEvent(this.identity.address.toString(), request));

        return request;
    }

    public async sent(params: ISentOutgoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = SentOutgoingRequestParameters.from(params);
        const request = await this._sent(parsedParams.requestId, parsedParams.requestSourceObject);

        const peer = parsedParams.requestSourceObject.recipients[0].address;
        if (!peer) throw Error; // TODO:
        await this._setDeletionRequestSent(request.content, peer);

        this.eventBus.publish(
            new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus: LocalRequestStatus.Draft,
                newStatus: request.status
            })
        );

        return request;
    }

    public async deleteRequestsToPeer(peer: CoreAddress): Promise<void> {
        const requests = await this.getOutgoingRequests({ peer: peer.toString() });
        for (const request of requests) {
            await this.localRequests.delete(request);
        }
    }

    private async _sent(requestId: CoreId, requestSourceObject: Message | RelationshipTemplate): Promise<LocalRequest> {
        const request = await this.getOrThrow(requestId);

        this.assertRequestStatus(request, LocalRequestStatus.Draft);

        request.changeStatus(LocalRequestStatus.Open);

        request.source = LocalRequestSource.from({
            reference: requestSourceObject.id,
            type: this.getSourceType(requestSourceObject)
        });

        await this.update(request);
        return request;
    }

    private async _setDeletionRequestSent(request: Request, peer: CoreAddress) {
        const requestItemsFromRequest = request.items.filter((item) => item instanceof RequestItem) as RequestItem[];
        const requestItemGroupsFromRequest = request.items.filter((item) => item instanceof RequestItemGroup);
        const requestItemsFromGroups = requestItemGroupsFromRequest.map((group) => group.items).flat();
        const requestItems = [...requestItemsFromRequest, ...requestItemsFromGroups];
        const deleteAttributeRequestItems = requestItems.filter((item) => item instanceof DeleteAttributeRequestItem);
        if (deleteAttributeRequestItems.length === 0) return;

        const forwardedAttributeIds = deleteAttributeRequestItems.map((item) => item.attributeId);
        for (const forwardedAttributeId of forwardedAttributeIds) {
            const attribute = await this.parent.attributes.getLocalAttribute(forwardedAttributeId);
            if (!attribute) {
                throw new ConsumptionError(`The forwarded Attribute ${forwardedAttributeId} of a created DeleteAttributeRequestItem was not found.`);
            }

            if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
                throw new ConsumptionError(
                    `The attribute ${forwardedAttributeId} of a created DeleteAttributeRequestItem is no own IdentityAttribute, own RelationshipAttribute or peer RelationshipAttribute.`
                );
            }
            const deletionInfo = ForwardedAttributeDeletionInfo.from({
                deletionStatus: ForwardedAttributeDeletionStatus.DeletionRequestSent,
                deletionDate: CoreDate.utc()
            });

            const predecessors = await this.parent.attributes.getPredecessorsOfAttribute(attribute);
            const attributes = [attribute, ...predecessors];

            const deletionWasRequestedFromInitialPeer = attribute instanceof OwnRelationshipAttribute && attribute.peerSharingInfo.peer.equals(peer);
            if (deletionWasRequestedFromInitialPeer) {
                await this.parent.attributes.setPeerDeletionInfoOfOwnRelationshipAttribute(attributes as OwnRelationshipAttribute[], deletionInfo);
            }
            await this.parent.attributes.setForwardedDeletionInfo(attributes, deletionInfo, peer);
        }
    }

    private getSourceType(sourceObject: Message | RelationshipTemplate): "Message" | "RelationshipTemplate" {
        if (sourceObject instanceof Message) {
            if (!sourceObject.isOwn) {
                throw new ConsumptionError("Cannot create outgoing Request from a peer Message");
            }

            return "Message";
        } else if (sourceObject instanceof RelationshipTemplate) {
            if (!sourceObject.isOwn) {
                throw new ConsumptionError("Cannot create outgoing Request from a peer Relationship Template");
            }

            return "RelationshipTemplate";
        }

        throw new ConsumptionError("The given sourceObject is not of a valid type. Valid types are 'Message' and 'RelationshipTemplate'.");
    }

    public async complete(params: ICompleteOutgoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CompleteOutgoingRequestParameters.from(params);
        const request = await this._complete(parsedParams.requestId, parsedParams.responseSourceObject, parsedParams.receivedResponse);

        this.eventBus.publish(
            new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), {
                request,
                oldStatus: LocalRequestStatus.Open,
                newStatus: request.status
            })
        );

        return request;
    }

    private async _complete(requestId: CoreId, responseSourceObject: Message | Relationship, receivedResponse: Response): Promise<LocalRequest> {
        const request = await this.getOrThrow(requestId);

        this.assertRequestStatus(request, LocalRequestStatus.Open, LocalRequestStatus.Expired);

        const responseSourceObjectCreationDate = responseSourceObject instanceof Message ? responseSourceObject.createdAt : responseSourceObject.auditLog[0].createdAt;
        if (request.status === LocalRequestStatus.Expired && request.isExpired(responseSourceObjectCreationDate)) {
            throw new ConsumptionError("Cannot complete an expired request with a response that was created before the expiration date");
        }

        const canComplete = await this.canComplete(request, receivedResponse);

        if (canComplete.isError()) throw canComplete.error;

        await this.applyItems(request.content.items, receivedResponse.items, request);

        let responseSource: "Message" | "Relationship";

        if (responseSourceObject instanceof Message) {
            responseSource = "Message";
        } else if (responseSourceObject instanceof Relationship) {
            responseSource = "Relationship";
        } else {
            throw new ConsumptionError("Invalid responseSourceObject");
        }

        const localResponse = LocalResponse.from({
            content: receivedResponse,
            createdAt: CoreDate.utc(),
            source: { reference: responseSourceObject.id, type: responseSource }
        });

        request.response = localResponse;
        request.changeStatus(LocalRequestStatus.Completed);

        await this.update(request);

        return request;
    }

    private async canComplete(request: LocalRequest, receivedResponse: Response): Promise<ValidationResult> {
        for (let i = 0; i < receivedResponse.items.length; i++) {
            const requestItem = request.content.items[i];
            if (requestItem instanceof RequestItem) {
                const responseItem = receivedResponse.items[i] as ResponseItem;
                const processor = this.processorRegistry.getProcessorForItem(requestItem);
                const canApplyItem = await processor.canApplyIncomingResponseItem(responseItem, requestItem, request);

                if (canApplyItem.isError()) {
                    return canApplyItem;
                }
            } else if (requestItem instanceof RequestItemGroup) {
                const responseGroup = receivedResponse.items[i] as ResponseItemGroup;

                for (let j = 0; j < requestItem.items.length; j++) {
                    const groupRequestItem = requestItem.items[j];
                    const groupResponseItem = responseGroup.items[j];

                    const processor = this.processorRegistry.getProcessorForItem(groupRequestItem);
                    const canApplyItem = await processor.canApplyIncomingResponseItem(groupResponseItem, groupRequestItem, request);

                    if (canApplyItem.isError()) {
                        return canApplyItem;
                    }
                }
            }
        }

        return ValidationResult.success();
    }

    private async applyItems(requestItems: (RequestItem | RequestItemGroup)[], responseItems: (ResponseItem | ResponseItemGroup)[], request: LocalRequest): Promise<void> {
        for (let i = 0; i < responseItems.length; i++) {
            const requestItem = requestItems[i];
            if (requestItem instanceof RequestItem) {
                const responseItem = responseItems[i] as ResponseItem;
                await this.applyItem(requestItem, responseItem, request);
            } else {
                const responseItemGroup = responseItems[i] as ResponseItemGroup;
                await this.applyItems(requestItem.items, responseItemGroup.items, request);
            }
        }
    }

    private async applyItem(requestItem: RequestItem, responseItem: ResponseItem, request: LocalRequest) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem);
        await processor.applyIncomingResponseItem(responseItem, requestItem, request);
    }

    public async getOutgoingRequests(query?: any): Promise<LocalRequest[]> {
        const requestDocs = await this.localRequests.find({
            ...query,
            isOwn: true
        });

        const requestPromises = requestDocs.map((r) => this.updateRequestExpiry(r, LocalRequest.from(r)));
        return await Promise.all(requestPromises);
    }

    public async discardOutgoingRequest(id: CoreId): Promise<void> {
        const request = await this.getOrThrow(id);
        this.assertRequestStatus(request, LocalRequestStatus.Draft);

        await this.localRequests.delete(request);
    }

    public async getOutgoingRequest(id: ICoreId): Promise<LocalRequest | undefined> {
        const requestDoc = await this.localRequests.findOne({ id: id.toString(), isOwn: true });
        if (!requestDoc) return;

        const localRequest = LocalRequest.from(requestDoc);
        return await this.updateRequestExpiry(requestDoc, localRequest);
    }

    private async getOrThrow(id: CoreId) {
        const request = await this.getOutgoingRequest(id);
        if (!request) {
            throw TransportCoreErrors.general.recordNotFound(LocalRequest, id.toString());
        }
        return request;
    }

    private async update(request: LocalRequest) {
        const requestDoc = await this.localRequests.findOne({ id: request.id.toString(), isOwn: true });
        if (!requestDoc) {
            throw TransportCoreErrors.general.recordNotFound(LocalRequest, request.id.toString());
        }
        await this.localRequests.update(requestDoc, request);
    }

    private assertRequestStatus(request: LocalRequest, ...status: LocalRequestStatus[]) {
        if (!status.includes(request.status)) {
            throw new ConsumptionError(`Local Request has to be in status '${status.join("/")}'.`);
        }
    }

    private async updateRequestExpiry(requestDoc: any, request: LocalRequest) {
        const oldStatus = request.status;

        const statusUpdated = request.updateStatusBasedOnExpiration();
        if (statusUpdated) {
            await this.localRequests.update(requestDoc, request);

            this.eventBus.publish(new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), { request: request, oldStatus, newStatus: request.status }));
        }

        return request;
    }
}
