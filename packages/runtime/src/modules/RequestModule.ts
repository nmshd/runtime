import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, LocalRequestStatus } from "@nmshd/consumption";
import {
    RelationshipCreationChangeRequestContent,
    RelationshipCreationChangeRequestContentJSON,
    RelationshipTemplateContentJSON,
    RequestJSON,
    ResponseJSON,
    ResponseResult,
    ResponseWrapper,
    ResponseWrapperJSON
} from "@nmshd/content";
import { AccountController, CoreId } from "@nmshd/transport";
import { Container } from "typescript-ioc";
import {
    IncomingRequestStatusChangedEvent,
    MessageProcessedEvent,
    MessageProcessedResult,
    MessageReceivedEvent,
    MessageSentEvent,
    PeerRelationshipTemplateLoadedEvent,
    RelationshipChangedEvent
} from "../events";
import { RelationshipTemplateProcessedEvent, RelationshipTemplateProcessedResult } from "../events/consumption/RelationshipTemplateProcessedEvent";
import { RuntimeModule } from "../extensibility/modules/RuntimeModule";
import { RuntimeServices } from "../Runtime";
import { LocalRequestDTO, RelationshipDTO, RelationshipStatus } from "../types";
import { RuntimeErrors } from "../useCases";

export class RequestModule extends RuntimeModule {
    public init(): void {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(PeerRelationshipTemplateLoadedEvent, this.handlePeerRelationshipTemplateLoaded.bind(this));
        this.subscribeToEvent(MessageReceivedEvent, this.handleMessageReceivedEvent.bind(this));
        this.subscribeToEvent(MessageSentEvent, this.handleMessageSentEvent.bind(this));
        this.subscribeToEvent(IncomingRequestStatusChangedEvent, this.handleIncomingRequestStatusChanged.bind(this));
        this.subscribeToEvent(RelationshipChangedEvent, this.handleRelationshipChangedEvent.bind(this));
    }

    private async handlePeerRelationshipTemplateLoaded(event: PeerRelationshipTemplateLoadedEvent) {
        const template = event.data;

        // make sure to not process an own template by accident
        if (template.isOwn) return;

        if (template.content["@type"] !== "RelationshipTemplateContent") {
            this.runtime.eventBus.publish(new RelationshipTemplateProcessedEvent(event.eventTargetAddress, { template, result: RelationshipTemplateProcessedResult.NoRequest }));
            return;
        }

        const body = template.content as RelationshipTemplateContentJSON;

        const services = await this.runtime.getServices(event.eventTargetAddress);

        const existingRequestsFromTemplate = (await services.consumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

        const nonCompletedRequests = existingRequestsFromTemplate.filter((r) => r.status !== LocalRequestStatus.Completed);
        if (nonCompletedRequests.length !== 0) {
            this.logger.info(`There is already an open Request for the RelationshipTemplate '${template.id}'.`);
            this.runtime.eventBus.publish(
                new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                    template,
                    result: RelationshipTemplateProcessedResult.NonCompletedRequestExists,
                    requestId: nonCompletedRequests[0].id
                })
            );
            return;
        }

        const relationshipsToPeer = (await services.transportServices.relationships.getRelationships({ query: { peer: template.createdBy } })).value;

        const pendingRelationships = relationshipsToPeer.filter((r) => r.status === RelationshipStatus.Pending);
        if (pendingRelationships.length !== 0) {
            this.logger.info(`There is already a pending Relationship for the RelationshipTemplate '${template.id}'. Skipping creation of a new request.`);
            this.runtime.eventBus.publish(
                new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                    template,
                    result: RelationshipTemplateProcessedResult.RelationshipExists,
                    relationshipId: pendingRelationships[0].id
                })
            );
            return;
        }

        const activeRelationships = relationshipsToPeer.filter((r) => r.status === RelationshipStatus.Active);
        if (activeRelationships.length !== 0) {
            if (body.onExistingRelationship) {
                const requestCreated = await this.createIncomingRequest(services, body.onExistingRelationship, template.id);
                if (!requestCreated) {
                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, { template, result: RelationshipTemplateProcessedResult.Error })
                    );
                }
                return;
            }

            this.logger.info(
                `There is already an open Relationship for the RelationshipTemplate '${template.id}' and onExistingRelationship is not defined. Skipping creation of a new request.`
            );
            this.runtime.eventBus.publish(
                new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                    template,
                    result: RelationshipTemplateProcessedResult.RelationshipExists,
                    relationshipId: activeRelationships[0].id
                })
            );
            return;
        }

        const requestCreated = await this.createIncomingRequest(services, body.onNewRelationship, template.id);

        if (!requestCreated) {
            this.runtime.eventBus.publish(new RelationshipTemplateProcessedEvent(event.eventTargetAddress, { template, result: RelationshipTemplateProcessedResult.Error }));
        }
    }

    private async handleMessageReceivedEvent(event: MessageReceivedEvent) {
        const services = await this.runtime.getServices(event.eventTargetAddress);

        const message = event.data;
        const messageContentType = message.content["@type"];
        switch (messageContentType) {
            case "Request":
                await this.createIncomingRequest(services, message.content as RequestJSON, message.id);
                break;

            // Handle responses directly sent via messages. This is only for backwards compatibility and
            // not viable for responding to Requests from RelationshipTemplates' onExistingRelationship.
            case "Response":
                await this.completeExistingRequestWithResponseReceivedByMessage(services, message.id, message.content as ResponseJSON);
                break;

            case "ResponseWrapper":
                const responseWrapper = message.content as ResponseWrapperJSON;

                if (responseWrapper.requestSourceType === "Message") {
                    await this.completeExistingRequestWithResponseReceivedByMessage(services, message.id, responseWrapper.response);
                    break;
                }

                await services.consumptionServices.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
                    responseSourceId: message.id,
                    templateId: responseWrapper.requestSourceReference,
                    response: responseWrapper.response
                });
                break;
        }

        if (messageContentType !== "Request") {
            this.runtime.eventBus.publish(new MessageProcessedEvent(event.eventTargetAddress, message, MessageProcessedResult.NoRequest));
        }
    }

    private async completeExistingRequestWithResponseReceivedByMessage(services: RuntimeServices, messageId: string, receivedResponse: ResponseJSON) {
        const result = await services.consumptionServices.outgoingRequests.complete({ receivedResponse, messageId });
        if (result.isError) {
            this.logger.error(`Could not complete outgoing request for message id ${messageId} due to ${result.error}. Root error:`, result.error);
        }
    }

    private async handleMessageSentEvent(event: MessageSentEvent) {
        const message = event.data;
        if (message.content["@type"] !== "Request") return;

        const services = await this.runtime.getServices(event.eventTargetAddress);
        const request = message.content as RequestJSON;

        const requestResult = await services.consumptionServices.outgoingRequests.sent({ requestId: request.id!, messageId: message.id });
        if (requestResult.isError) {
            this.logger.error(`Could not mark request '${request.id}' as sent using message '${message.id}'. Root error:`, requestResult.error);
            return;
        }
    }

    private async createIncomingRequest(services: RuntimeServices, request: RequestJSON, requestSourceId: string) {
        const receivedRequestResult = await services.consumptionServices.incomingRequests.received({ receivedRequest: request, requestSourceId });
        if (receivedRequestResult.isError) {
            this.logger.error(`Could not receive request ${request.id}. Root error:`, receivedRequestResult.error);
            return false;
        }

        const checkPrerequisitesResult = await services.consumptionServices.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });
        if (checkPrerequisitesResult.isError) {
            this.logger.error(`Could not check prerequisites for request ${request.id}. Root error:`, checkPrerequisitesResult.error);
            return false;
        }
        return true;
    }

    private async handleIncomingRequestStatusChanged(event: IncomingRequestStatusChangedEvent) {
        if (event.data.newStatus !== LocalRequestStatus.Decided) return;

        const request = event.data.request;
        switch (request.source!.type) {
            case "RelationshipTemplate":
                await this.handleIncomingRequestDecidedForRelationshipTemplate(event);
                break;
            case "Message":
                await this.handleIncomingRequestDecidedForMessage(event);
                break;
            default:
                throw new Error(`Cannot handle source.type '${request.source!.type}'.`);
        }
    }

    private async handleIncomingRequestDecidedForRelationshipTemplate(event: IncomingRequestStatusChangedEvent) {
        const request = event.data.request;
        const services = await this.runtime.getServices(event.eventTargetAddress);

        const activeRelationshipsToPeer = (
            await services.transportServices.relationships.getRelationships({ query: { peer: event.data.request.peer, status: RelationshipStatus.Active } })
        ).value;

        if (activeRelationshipsToPeer.length === 0) {
            await this.respondToRequestViaRelationship(request, event.eventTargetAddress);
        } else {
            await this.respondToRequestViaMessage(request, event.eventTargetAddress);
        }
    }

    private async respondToRequestViaRelationship(request: LocalRequestDTO, currentIdentity: string) {
        const services = await this.runtime.getServices(currentIdentity);
        const templateId = request.source!.reference;

        if (request.response!.content.result === ResponseResult.Rejected) {
            await services.consumptionServices.incomingRequests.complete({ requestId: request.id });
            return;
        }

        const creationChangeContent = RelationshipCreationChangeRequestContent.from({ response: request.response!.content });
        const createRelationshipResult = await services.transportServices.relationships.createRelationship({ templateId, content: creationChangeContent });
        if (createRelationshipResult.isError) {
            this.logger.error(`Could not create relationship for templateId '${templateId}'. Root error:`, createRelationshipResult.error);
            return;
        }

        const requestId = request.id;
        const completeRequestResult = await services.consumptionServices.incomingRequests.complete({
            requestId,
            responseSourceId: createRelationshipResult.value.changes[0].id
        });
        if (completeRequestResult.isError) {
            this.logger.error(`Could not complete the request '${requestId}'. Root error:`, completeRequestResult.error);
            return;
        }
    }

    private async respondToRequestViaMessage(request: LocalRequestDTO, currentIdentity: string) {
        const requestId = request.id;

        const services = await this.runtime.getServices(currentIdentity);
        const messageContent = ResponseWrapper.from({
            "@type": "ResponseWrapper",
            response: request.response!.content,
            requestId,
            requestSourceReference: request.source!.reference,
            requestSourceType: request.source!.type
        }).toJSON();

        const sendMessageResult = await services.transportServices.messages.sendMessage({
            recipients: [request.peer],
            content: messageContent
        });
        if (sendMessageResult.isError) {
            this.logger.error(`Could not send message to answer the request '${requestId}'.`, sendMessageResult.error);
            return;
        }

        const completeRequestResult = await services.consumptionServices.incomingRequests.complete({
            requestId,
            responseSourceId: sendMessageResult.value.id
        });
        if (completeRequestResult.isError) {
            this.logger.error(`Could not complete the request '${requestId}'. Root error:`, completeRequestResult.error);
            return;
        }
    }

    private async handleIncomingRequestDecidedForMessage(event: IncomingRequestStatusChangedEvent) {
        await this.respondToRequestViaMessage(event.data.request, event.eventTargetAddress);
    }

    private async handleRelationshipChangedEvent(event: RelationshipChangedEvent) {
        const createdRelationship = event.data;

        if (createdRelationship.status === RelationshipStatus.Rejected || createdRelationship.status === RelationshipStatus.Revoked) {
            await this.deleteSharedAttributesForRejectedOrRevokedRelationship(event.eventTargetAddress, createdRelationship);
        }

        // only trigger for new relationships that were created from an own template
        if (createdRelationship.status !== RelationshipStatus.Pending || !createdRelationship.template.isOwn) return;

        const services = await this.runtime.getServices(event.eventTargetAddress);

        const template = createdRelationship.template;
        const templateId = template.id;
        // do not trigger for templates without the correct content type
        if (template.content["@type"] !== "RelationshipTemplateContent") return;

        const relationshipCreationChange = createdRelationship.changes[0];
        const relationshipChangeId = relationshipCreationChange.id;
        // do not trigger for creation changes without the correct content type
        if (relationshipCreationChange.request.content["@type"] !== "RelationshipCreationChangeRequestContent") return;

        const relationshipCreationChangeContent = relationshipCreationChange.request.content as RelationshipCreationChangeRequestContentJSON;
        const result = await services.consumptionServices.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
            templateId,
            responseSourceId: relationshipChangeId,
            response: relationshipCreationChangeContent.response
        });
        if (result.isError) {
            this.logger.error(`Could not create and complete request for templateId '${templateId}' and changeId '${relationshipChangeId}'. Root error:`, result.error);
            return;
        }
    }

    private async deleteSharedAttributesForRejectedOrRevokedRelationship(eventTargetAddress: string, relationship: RelationshipDTO) {
        const attributesController = Container.get<AttributesController>(AttributesController);
        const accountController = Container.get<AccountController>(AccountController);

        const services = await this.runtime.getServices(eventTargetAddress);
        const sharedAttributeDTOs = (await services.consumptionServices.attributes.getAttributes({ query: { "shareInfo.peer": relationship.peer } })).value;

        for (const sharedAttributeDTO of sharedAttributeDTOs) {
            const sharedAttribute = await attributesController.getLocalAttribute(CoreId.from(sharedAttributeDTO.id));
            if (!sharedAttribute) throw RuntimeErrors.general.recordNotFound(LocalAttribute);

            const validationResult = await attributesController.validateFullAttributeDeletionProcess(sharedAttribute);
            if (validationResult.isError()) {
                return Result.fail(validationResult.error);
            }

            await attributesController.executeFullAttributeDeletionProcess(sharedAttribute);
        }

        await accountController.syncDatawallet();
        return;
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
