import { LocalRequestStatus } from "@nmshd/consumption";
import { RequestItemJSON } from "@nmshd/content";
import {
    IncomingRequestStatusChangedEvent,
    MessageProcessedEvent,
    MessageProcessedResult,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult
} from "../events";
import { ModuleConfiguration, RuntimeModule } from "../extensibility";
import { RuntimeServices } from "../Runtime";
import { LocalRequestDTO } from "../types";
import { RequestConfig, ResponseConfig } from "./decide";

// TODO: maybe this should be more flexible than an OR-list of AND-elements -> simple for now
export interface DeciderModuleConfiguration extends ModuleConfiguration {
    automationConfig?: AutomationConfig[];
}

// TODO: add validation for fitting requestConfig-responseConfig combination
export interface AutomationConfig {
    requestConfig: RequestConfig;
    responseConfig: ResponseConfig;
}

export class DeciderModule extends RuntimeModule<DeciderModuleConfiguration> {
    public init(): void {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(IncomingRequestStatusChangedEvent, this.handleIncomingRequestStatusChanged.bind(this));
    }

    private async handleIncomingRequestStatusChanged(event: IncomingRequestStatusChangedEvent) {
        if (event.data.newStatus !== LocalRequestStatus.DecisionRequired) return;

        // TODO: before changing the status of the Request, as many RequestItems as possible should be automatically processed
        if (event.data.request.content.items.some(flaggedAsManualDecisionRequired)) return await this.requireManualDecision(event);

        // TODO: this is the same as above??
        return await this.requireManualDecision(event);
    }

    private async automaticallyDecideRequest(request: LocalRequestDTO) {
        if (!this.configuration.automationConfig) return;

        for (const configElement of this.configuration.automationConfig) {
            // check if configElement.requestConfig matches (a part of) the Request (where manualDecisionRequired is not set)
            // if so apply configElement.responseConfig
        }

        return;
    }

    private async requireManualDecision(event: IncomingRequestStatusChangedEvent): Promise<void> {
        const request = event.data.request;
        const services = await this.runtime.getServices(event.eventTargetAddress);

        const requireManualDecisionResult = await services.consumptionServices.incomingRequests.requireManualDecision({ requestId: request.id });
        if (requireManualDecisionResult.isError) {
            this.logger.error(`Could not require manual decision for Request ${request.id}`, requireManualDecisionResult.error);
            await this.publishEvent(event, services, "Error");
            return;
        }

        await this.publishEvent(event, services, "ManualRequestDecisionRequired", request.id);
    }

    private async publishEvent(
        event: IncomingRequestStatusChangedEvent,
        services: RuntimeServices,
        result: keyof typeof RelationshipTemplateProcessedResult & keyof typeof MessageProcessedResult,
        requestId?: string
    ) {
        const request = event.data.request;
        switch (request.source!.type) {
            case "RelationshipTemplate":
                const getTemplateResult = await services.transportServices.relationshipTemplates.getRelationshipTemplate({ id: request.source!.reference });
                const template = getTemplateResult.value;

                if (result === "NoRequest" || result === "Error") {
                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                            template,
                            result: result as RelationshipTemplateProcessedResult.Error | RelationshipTemplateProcessedResult.NoRequest
                        })
                    );
                }

                if (result === "ManualRequestDecisionRequired") {
                    if (!requestId) throw new Error("Request ID is required for manual decision required result.");

                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                            template,
                            result: result as RelationshipTemplateProcessedResult.ManualRequestDecisionRequired,
                            requestId
                        })
                    );
                }

                break;
            case "Message":
                const getMessageResult = await services.transportServices.messages.getMessage({ id: request.source!.reference });
                const message = { ...getMessageResult.value, attachments: getMessageResult.value.attachments.map((a) => a.id) };
                this.runtime.eventBus.publish(new MessageProcessedEvent(event.eventTargetAddress, message, result as MessageProcessedResult));
                break;
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}

function flaggedAsManualDecisionRequired(itemOrGroup: { items?: RequestItemJSON[]; requireManualDecision?: boolean }) {
    return itemOrGroup.requireManualDecision ?? itemOrGroup.items?.some((i) => i.requireManualDecision);
}
