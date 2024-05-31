import { EventBus } from "@js-soft/ts-utils";
import { DeleteAttributeRequestItem, RelationshipTemplateContent, Request, RequestItem, RequestItemGroup, Response, ResponseItem, ResponseItemGroup } from "@nmshd/content";
import {
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreAddress,
    ICoreId,
    Message,
    Relationship,
    RelationshipChange,
    RelationshipTemplate,
    SynchronizedCollection,
    CoreErrors as TransportCoreErrors
} from "@nmshd/transport";
import { ConsumptionBaseController } from "../../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../../consumption/ConsumptionControllerName";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../../consumption/ConsumptionIds";
import { DeletionStatus, LocalAttributeDeletionInfo } from "../../attributes";
import { ValidationResult } from "../../common/ValidationResult";
import { OutgoingRequestCreatedAndCompletedEvent, OutgoingRequestCreatedEvent, OutgoingRequestStatusChangedEvent } from "../events";
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry";
import { LocalRequest, LocalRequestSource } from "../local/LocalRequest";
import { LocalRequestStatus } from "../local/LocalRequestStatus";
import { LocalResponse } from "../local/LocalResponse";
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
            getActiveRelationshipToIdentity(id: ICoreAddress): Promise<Relationship | undefined>;
        }
    ) {
        super(ConsumptionControllerName.RequestsController, parent);
    }

    public async canCreate(params: ICanCreateOutgoingRequestParameters): Promise<ValidationResult> {
        const parsedParams = CanCreateOutgoingRequestParameters.from(params);

        const innerResults = await this.canCreateItems(parsedParams.content, parsedParams.peer);

        const result = ValidationResult.fromItems(innerResults);

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

        await this._setDeletionInfo(parsedParams.content);

        this.eventBus.publish(new OutgoingRequestCreatedEvent(this.identity.address.toString(), request));

        return request;
    }

    private async _create(id: CoreId, content: Request, peer: CoreAddress) {
        const canCreateResult = await this.canCreate({ content, peer });

        if (canCreateResult.isError()) throw canCreateResult.error;

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

    private async _setDeletionInfo(content: Request) {
        const requestItemsFromRequest = content.items.filter((item) => item instanceof RequestItem) as RequestItem[];
        const requestItemGroupsFromRequest = content.items.filter((item) => item instanceof RequestItemGroup) as RequestItemGroup[];
        const requestItemsFromGroups = requestItemGroupsFromRequest.map((group) => group.items).flat();
        const requestItems = [...requestItemsFromRequest, ...requestItemsFromGroups];
        const deleteAttributeRequestItems = requestItems.filter((item) => item instanceof DeleteAttributeRequestItem) as DeleteAttributeRequestItem[];
        if (deleteAttributeRequestItems.length === 0) return;

        const ownSharedAttributeIds = deleteAttributeRequestItems.map((item) => item.attributeId);
        for (const ownSharedAttributeId of ownSharedAttributeIds) {
            const ownSharedAttribute = await this.parent.attributes.getLocalAttribute(ownSharedAttributeId);
            if (!ownSharedAttribute) {
                throw new ConsumptionError(`The own shared Attribute ${ownSharedAttributeId} of a created DeleteAttributeRequestItem was not found.`);
            }

            const deletionInfo = LocalAttributeDeletionInfo.from({
                deletionStatus: DeletionStatus.DeletionRequestSent,
                deletionDate: CoreDate.utc()
            });
            ownSharedAttribute.setDeletionInfo(deletionInfo, this.identity.address);
            await this.parent.attributes.updateAttributeUnsafe(ownSharedAttribute);
        }
    }

    public async createAndCompleteFromRelationshipTemplateResponse(params: ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters): Promise<LocalRequest> {
        const parsedParams = CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters.from(params);

        const peer = parsedParams.responseSource instanceof RelationshipChange ? parsedParams.responseSource.request.createdBy : parsedParams.responseSource.cache!.createdBy;
        const response = parsedParams.response;
        const requestId = response.requestId;

        const templateContent = parsedParams.template.cache!.content;
        if (!(templateContent instanceof RelationshipTemplateContent)) {
            throw new ConsumptionError("The content of the template is not supported as it is not type of RelationshipTemplateContent.");
        }

        // checking for an active relationship is not secure as in the meantime the relationship could have been accepted
        const isFromNewRelationship = parsedParams.responseSource instanceof RelationshipChange && parsedParams.responseSource.type === "Creation";

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

        this.eventBus.publish(
            new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus: LocalRequestStatus.Draft,
                newStatus: request.status
            })
        );

        return request;
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

    private async _complete(requestId: CoreId, responseSourceObject: Message | RelationshipChange, receivedResponse: Response): Promise<LocalRequest> {
        const request = await this.getOrThrow(requestId);

        this.assertRequestStatus(request, LocalRequestStatus.Open, LocalRequestStatus.Expired);

        const responseSourceObjectCreationDate = responseSourceObject instanceof Message ? responseSourceObject.cache!.createdAt : responseSourceObject.request.createdAt;
        if (request.status === LocalRequestStatus.Expired && request.isExpired(responseSourceObjectCreationDate)) {
            throw new ConsumptionError("Cannot complete an expired request with a response that was created before the expiration date");
        }

        const canComplete = await this.canComplete(request, receivedResponse);

        if (canComplete.isError()) throw canComplete.error;

        await this.applyItems(request.content.items, receivedResponse.items, request);

        let responseSource: "Message" | "RelationshipChange";

        if (responseSourceObject instanceof Message) {
            responseSource = "Message";
        } else if (responseSourceObject instanceof RelationshipChange) {
            responseSource = "RelationshipChange";
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

        const requestPromises = requestDocs.map((r) => this.updateRequestExpiry(LocalRequest.from(r)));
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
        return await this.updateRequestExpiry(localRequest);
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

    private async updateRequestExpiry(request: LocalRequest) {
        const statusUpdated = request.updateStatusBasedOnExpiration();
        if (statusUpdated) await this.update(request);
        return request;
    }
}
