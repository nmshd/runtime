import { ServalError } from "@js-soft/ts-serval";
import { EventBus } from "@js-soft/ts-utils";
import { RequestItem, RequestItemGroup, Response, ResponseItemDerivations, ResponseItemGroup, ResponseResult } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { Message, PeerDeletionStatus, Relationship, RelationshipStatus, RelationshipTemplate, SynchronizedCollection, TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../../consumption/ConsumptionControllerName";
import { ConsumptionCoreErrors } from "../../../consumption/ConsumptionCoreErrors";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { ConsumptionIds } from "../../../consumption/ConsumptionIds";
import { mergeResults } from "../../common";
import { ValidationResult } from "../../common/ValidationResult";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../events";
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry";
import { ILocalRequestSource, LocalRequest } from "../local/LocalRequest";
import { LocalRequestStatus } from "../local/LocalRequestStatus";
import { LocalResponse, LocalResponseSource } from "../local/LocalResponse";
import { validateKeyUniquenessOfRelationshipAttributesWithinIncomingRequest } from "../utility/validateRelationshipAttributesWithinRequest";
import { DecideRequestParametersValidator } from "./DecideRequestParametersValidator";
import { CheckPrerequisitesOfIncomingRequestParameters, ICheckPrerequisitesOfIncomingRequestParameters } from "./checkPrerequisites/CheckPrerequisitesOfIncomingRequestParameters";
import { CompleteIncomingRequestParameters, ICompleteIncomingRequestParameters } from "./complete/CompleteIncomingRequestParameters";
import { DecideRequestItemGroupParametersJSON } from "./decide/DecideRequestItemGroupParameters";
import { DecideRequestItemParametersJSON } from "./decide/DecideRequestItemParameters";
import { DecideRequestParametersJSON } from "./decide/DecideRequestParameters";
import { InternalDecideRequestParameters, InternalDecideRequestParametersJSON } from "./decide/InternalDecideRequestParameters";
import { IReceivedIncomingRequestParameters, ReceivedIncomingRequestParameters } from "./received/ReceivedIncomingRequestParameters";
import {
    IRequireManualDecisionOfIncomingRequestParameters,
    RequireManualDecisionOfIncomingRequestParameters
} from "./requireManualDecision/RequireManualDecisionOfIncomingRequestParameters";

export class IncomingRequestsController extends ConsumptionBaseController {
    private readonly decideRequestParamsValidator: DecideRequestParametersValidator = new DecideRequestParametersValidator();

    public constructor(
        private readonly localRequests: SynchronizedCollection,
        private readonly processorRegistry: RequestItemProcessorRegistry,
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress },
        private readonly relationshipResolver: {
            getRelationshipToIdentity(id: CoreAddress): Promise<Relationship | undefined>;
            getExistingRelationshipToIdentity(id: CoreAddress): Promise<Relationship | undefined>;
        }
    ) {
        super(ConsumptionControllerName.RequestsController, parent);
    }

    public async received(params: IReceivedIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = ReceivedIncomingRequestParameters.from(params);

        const infoFromSource = this.extractInfoFromSource(parsedParams.requestSourceObject);

        const request = LocalRequest.from({
            id: parsedParams.receivedRequest.id ?? (await ConsumptionIds.request.generate()),
            createdAt: CoreDate.utc(),
            status: LocalRequestStatus.Open,
            content: parsedParams.receivedRequest,
            isOwn: false,
            peer: infoFromSource.peer,
            source: infoFromSource.source,
            statusLog: []
        });

        if (!(await this.relationshipResolver.getExistingRelationshipToIdentity(CoreAddress.from(infoFromSource.peer))) && infoFromSource.expiresAt) {
            request.content.expiresAt = CoreDate.min(infoFromSource.expiresAt, request.content.expiresAt);
            request.updateStatusBasedOnExpiration();
        }

        await this.localRequests.create(request);

        this.eventBus.publish(new IncomingRequestReceivedEvent(this.identity.address.toString(), request));

        return request;
    }

    private extractInfoFromSource(source: Message | RelationshipTemplate): InfoFromSource {
        if (source instanceof Message) {
            return this.extractInfoFromMessage(source);
        }

        return this.extractInfoFromRelationshipTemplate(source);
    }

    private extractInfoFromMessage(message: Message): InfoFromSource {
        if (message.isOwn) throw new ConsumptionError("Cannot create incoming Request from own Message");

        return {
            peer: message.cache!.createdBy,
            source: {
                reference: message.id,
                type: "Message"
            }
        };
    }

    private extractInfoFromRelationshipTemplate(template: RelationshipTemplate): InfoFromSource {
        if (template.isOwn) throw new ConsumptionError("Cannot create incoming Request from own Relationship Template");

        return {
            peer: template.cache!.createdBy,
            source: {
                reference: template.id,
                type: "RelationshipTemplate"
            },
            expiresAt: template.cache!.expiresAt
        };
    }

    public async checkPrerequisites(params: ICheckPrerequisitesOfIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CheckPrerequisitesOfIncomingRequestParameters.from(params);
        const request = await this.getOrThrow(parsedParams.requestId);

        this.assertRequestStatus(request, LocalRequestStatus.Open);

        for (const item of request.content.items) {
            if (item instanceof RequestItem) {
                const processor = this.processorRegistry.getProcessorForItem(item);
                const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(item, request);
                if (!prerequisitesFulfilled) {
                    return request;
                }
            } else {
                for (const childItem of item.items) {
                    const processor = this.processorRegistry.getProcessorForItem(childItem);
                    const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(childItem, request);
                    if (!prerequisitesFulfilled) {
                        return request;
                    }
                }
            }
        }

        request.changeStatus(LocalRequestStatus.DecisionRequired);

        await this.update(request);

        this.eventBus.publish(
            new IncomingRequestStatusChangedEvent(this.identity.address.toString(), {
                request,
                oldStatus: LocalRequestStatus.Open,
                newStatus: request.status
            })
        );

        return request;
    }

    public async requireManualDecision(params: IRequireManualDecisionOfIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = RequireManualDecisionOfIncomingRequestParameters.from(params);
        const request = await this.getOrThrow(parsedParams.requestId);

        this.assertRequestStatus(request, LocalRequestStatus.DecisionRequired);

        request.changeStatus(LocalRequestStatus.ManualDecisionRequired);
        await this.update(request);

        this.eventBus.publish(
            new IncomingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus: LocalRequestStatus.DecisionRequired,
                newStatus: request.status
            })
        );

        return request;
    }

    public async canAccept(params: DecideRequestParametersJSON): Promise<ValidationResult> {
        const canDecideResult = await this.canDecide({ ...params, accept: true });

        if (canDecideResult.isError()) return canDecideResult;

        const request = await this.getOrThrow(params.requestId);
        const keyUniquenessValidationResult = validateKeyUniquenessOfRelationshipAttributesWithinIncomingRequest(request.content.items, params.items, this.identity.address);
        if (keyUniquenessValidationResult.isError()) return keyUniquenessValidationResult;

        return canDecideResult;
    }

    public async canReject(params: DecideRequestParametersJSON): Promise<ValidationResult> {
        return await this.canDecide({ ...params, accept: false });
    }

    private async canDecide(params: InternalDecideRequestParametersJSON): Promise<ValidationResult> {
        // syntactic validation
        InternalDecideRequestParameters.from(params);
        const request = await this.getOrThrow(params.requestId);

        const relationship = await this.relationshipResolver.getRelationshipToIdentity(request.peer);
        // It is safe to decide an incoming Request when no Relationship is found as this is the case when the Request origins from onNewRelationship of the RelationshipTemplateContent
        const possibleStatuses =
            request.source?.type === "RelationshipTemplate" ? [RelationshipStatus.Active, RelationshipStatus.Rejected, RelationshipStatus.Revoked] : [RelationshipStatus.Active];

        if (relationship && !possibleStatuses.includes(relationship.status)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.wrongRelationshipStatus(
                    `You cannot decide a request from '${request.peer.toString()}' since the relationship is in status '${relationship.status}'.`
                )
            );
        }

        this.assertRequestStatus(request, LocalRequestStatus.DecisionRequired, LocalRequestStatus.ManualDecisionRequired);

        if (relationship?.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.ToBeDeleted) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.peerIsInDeletion(`You cannot decide a Request from peer '${request.peer.toString()}' since the peer is in deletion.`)
            );
        }

        if (relationship?.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted) {
            return ValidationResult.error(
                ConsumptionCoreErrors.requests.peerIsDeleted(`You cannot decide a Request from peer '${request.peer.toString()}' since the peer is deleted.`)
            );
        }

        const validateRequestResult = this.decideRequestParamsValidator.validateRequest(params, request);
        if (validateRequestResult.isError()) return validateRequestResult;

        const validateItemsResult = this.decideRequestParamsValidator.validateItems(params, request);

        const canDecideItemsResults = await this.canDecideItems(params.items, request.content.items, request);
        const canDecideItemsResult = ValidationResult.fromItems(canDecideItemsResults);

        try {
            return mergeResults(validateItemsResult, canDecideItemsResult);
        } catch (_) {
            this._log.error(
                `Merging '${JSON.stringify(validateItemsResult)}' and '${JSON.stringify(canDecideItemsResult)}' was not possible because their dimensions don't match.`
            );
            return validateItemsResult.isError() ? validateItemsResult : canDecideItemsResult;
        }
    }

    private async canDecideGroup(params: DecideRequestItemGroupParametersJSON, requestItemGroup: RequestItemGroup, request: LocalRequest) {
        const itemResults = await this.canDecideItems(params.items, requestItemGroup.items, request);
        return ValidationResult.fromItems(itemResults);
    }

    private async canDecideItems(
        params: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
        items: (RequestItem | RequestItemGroup)[],
        request: LocalRequest
    ) {
        const validationResults: ValidationResult[] = [];

        for (let i = 0; i < params.length; i++) {
            const decideItemParams = params[i];
            const requestItem = items[i];

            if (requestItem instanceof RequestItemGroup) {
                const groupResult = await this.canDecideGroup(decideItemParams as DecideRequestItemGroupParametersJSON, requestItem, request);
                validationResults.push(groupResult);
            } else {
                const itemResult = await this.canDecideItem(decideItemParams as DecideRequestItemParametersJSON, requestItem, request);
                validationResults.push(itemResult);
            }
        }

        return validationResults;
    }

    private async canDecideItem(params: DecideRequestItemParametersJSON, requestItem: RequestItem, request: LocalRequest) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem);

        try {
            if (params.accept) return await processor.canAccept(requestItem, params, request);

            return await processor.canReject(requestItem, params, request);
        } catch (e) {
            if (e instanceof ServalError) {
                return ValidationResult.error(ConsumptionCoreErrors.requests.servalErrorDuringRequestItemProcessing(e));
            }

            return ValidationResult.error(ConsumptionCoreErrors.requests.unexpectedErrorDuringRequestItemProcessing(e));
        }
    }

    public async accept(params: DecideRequestParametersJSON): Promise<LocalRequest> {
        const canAccept = await this.canAccept(params);
        if (!canAccept.isSuccess()) {
            throw new ConsumptionError("Cannot accept the Request with the given parameters. Call 'canAccept' to get more information.");
        }
        return await this.decide({ ...params, accept: true });
    }

    public async reject(params: DecideRequestParametersJSON): Promise<LocalRequest> {
        const canReject = await this.canReject(params);
        if (!canReject.isSuccess()) {
            throw new ConsumptionError("Cannot reject the Request with the given parameters. Call 'canReject' to get more information.");
        }
        return await this.decide({ ...params, accept: false });
    }

    private async decide(params: InternalDecideRequestParametersJSON) {
        const request = await this.getOrThrow(params.requestId);

        this.assertRequestStatus(request, LocalRequestStatus.DecisionRequired, LocalRequestStatus.ManualDecisionRequired);

        const localResponse = await this.createLocalResponse(params, request);
        const oldStatus = request.status;

        request.response = localResponse;
        request.changeStatus(LocalRequestStatus.Decided);

        await this.update(request);

        this.eventBus.publish(
            new IncomingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus,
                newStatus: request.status
            })
        );

        return request;
    }

    private async createLocalResponse(params: InternalDecideRequestParametersJSON, request: LocalRequest) {
        const requestItems = request.content.items;
        const responseItems = await this.decideItems(params.items, requestItems, request);

        const response = Response.from({
            result: params.accept ? ResponseResult.Accepted : ResponseResult.Rejected,
            requestId: request.id,
            items: responseItems
        });

        const localResponse = LocalResponse.from({
            content: response,
            createdAt: CoreDate.utc()
        });

        return localResponse;
    }

    private async decideGroup(groupItemParam: DecideRequestItemGroupParametersJSON, requestItemGroup: RequestItemGroup, request: LocalRequest) {
        const items = (await this.decideItems(groupItemParam.items, requestItemGroup.items, request)) as ResponseItemDerivations[];

        const group = ResponseItemGroup.from({ items });
        return group;
    }

    private async decideItems(
        params: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
        requestItems: (RequestItemGroup | RequestItem)[],
        request: LocalRequest
    ): Promise<(ResponseItemDerivations | ResponseItemGroup)[]> {
        const responseItems: (ResponseItemDerivations | ResponseItemGroup)[] = [];

        for (let i = 0; i < params.length; i++) {
            const itemParam = params[i];
            const item = requestItems[i];

            if (item instanceof RequestItemGroup) {
                responseItems.push(await this.decideGroup(itemParam as DecideRequestItemGroupParametersJSON, item, request));
            } else {
                responseItems.push(await this.decideItem(itemParam as DecideRequestItemParametersJSON, requestItems[i] as RequestItem, request));
            }
        }
        return responseItems;
    }

    private async decideItem(params: DecideRequestItemParametersJSON, requestItem: RequestItem, request: LocalRequest): Promise<ResponseItemDerivations> {
        const processor = this.processorRegistry.getProcessorForItem(requestItem);

        try {
            if (params.accept) {
                return await processor.accept(requestItem, params, request);
            }
            return await processor.reject(requestItem, params, request);
        } catch (e) {
            let details = "";
            if (e instanceof Error) {
                details = ` Details: ${e.message}`;
            }
            throw new ConsumptionError(`An error occurred while processing a '${requestItem.constructor.name}'. You should contact the developer of this RequestItem.${details}}`);
        }
    }

    public async complete(params: ICompleteIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CompleteIncomingRequestParameters.from(params);
        const request = await this.getOrThrow(parsedParams.requestId);

        if (request.isOwn) {
            throw new ConsumptionError("Cannot decide own Request");
        }

        this.assertRequestStatus(request, LocalRequestStatus.Decided);

        const requestIsRejected = request.response!.content.result === ResponseResult.Rejected;
        const requestIsFromTemplate = request.source!.type === "RelationshipTemplate";

        if (parsedParams.responseSourceObject) {
            request.response!.source = LocalResponseSource.from({
                type: parsedParams.responseSourceObject instanceof Message ? "Message" : "Relationship",
                reference: parsedParams.responseSourceObject.id
            });
        } else if (!requestIsRejected || !requestIsFromTemplate) {
            throw new ConsumptionError("A Request can only be completed without a responseSource if the Request is rejected and the Request is from a Relationship Template");
        }

        request.changeStatus(LocalRequestStatus.Completed);

        await this.update(request);

        this.eventBus.publish(
            new IncomingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus: LocalRequestStatus.Decided,
                newStatus: request.status
            })
        );

        return request;
    }

    public async getIncomingRequests(query?: any): Promise<LocalRequest[]> {
        const requestDocs = await this.localRequests.find({
            ...query,
            isOwn: false
        });

        const requestPromises = requestDocs.map((r) => this.updateRequestExpiry(LocalRequest.from(r)));
        return await Promise.all(requestPromises);
    }

    public async getIncomingRequest(idIncomingRequest: ICoreId): Promise<LocalRequest | undefined> {
        const requestDoc = await this.localRequests.findOne({ id: idIncomingRequest.toString(), isOwn: false });
        if (!requestDoc) return;

        const localRequest = LocalRequest.from(requestDoc);

        return await this.updateRequestExpiry(localRequest);
    }

    private async getOrThrow(id: CoreId | string) {
        const request = await this.getIncomingRequest(CoreId.from(id));
        if (!request) {
            throw TransportCoreErrors.general.recordNotFound(LocalRequest, id.toString());
        }
        return request;
    }

    private async update(request: LocalRequest) {
        const requestDoc = await this.localRequests.findOne({ id: request.id.toString(), isOwn: false });
        if (!requestDoc) {
            throw TransportCoreErrors.general.recordNotFound(LocalRequest, request.id.toString());
        }
        await this.localRequests.update(requestDoc, request);
    }

    public async deleteRequestsFromPeer(peer: CoreAddress): Promise<void> {
        const requests = await this.getIncomingRequests({ peer: peer.toString() });
        for (const request of requests) {
            await this.localRequests.delete(request);
        }
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

interface InfoFromSource {
    peer: ICoreAddress;
    source: ILocalRequestSource;
    expiresAt?: CoreDate;
}
