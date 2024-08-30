import { LocalRequestStatus, LocalResponse } from "@nmshd/consumption";
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
import { isRequestItemDerivationConfig, RequestConfig, ResponseConfig } from "./decide";

// simple OR-list of AND-elements with decreasing priority
export interface DeciderModuleConfiguration extends ModuleConfiguration {
    automationConfig?: AutomationConfig[];
}

export type DeciderModuleConfigurationOverwrite = Partial<DeciderModuleConfiguration>;

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

        if (event.data.request.content.items.some(flaggedAsManualDecisionRequired)) return await this.requireManualDecision(event);

        // Request is only decided automatically, if all its items can be processed automatically
        const automationResult = await this.tryToAutomaticallyDecideRequest(event.data.request);
        if (automationResult.automaticallyDecided) {
            // TODO: move request to status Decided and return
        }

        return await this.requireManualDecision(event);
    }

    private async tryToAutomaticallyDecideRequest(request: LocalRequestDTO): Promise<{ automaticallyDecided: boolean; response?: LocalResponse }> {
        if (!this.configuration.automationConfig) return { automaticallyDecided: false };

        for (const automationConfigElement of this.configuration.automationConfig) {
            // check if requestConfig matches (a part of) the Request
            const requestConfigElement = automationConfigElement.requestConfig;
            if (isRequestItemDerivationConfig(requestConfigElement)) {
                // TODO: check for RequestItem compatibility
            }
            // TODO: check for general Request compatibility

            // TODO: if so apply configElement.responseConfig
            const responseConfigElement = automationConfigElement.responseConfig;
        }

        return { automaticallyDecided: false };
    }

    private checkRequestItemCompatibility(requestConfigElement: RequestConfig, request: LocalRequestDTO): boolean {}

    private checkGeneralRequestCompatibility(requestConfigElement: RequestConfig, request: LocalRequestDTO): boolean {
        let compatibility = true;
        // maybe forEach instead
        for (const property in requestConfigElement) {
            if (typeof requestConfigElement[property as keyof RequestConfig] === "string") {
                compatibility &&= requestConfigElement[property as keyof RequestConfig] === request[property as keyof LocalRequestDTO];
            } else {
                // else if (Array.isArray(requestConfigElement[property as keyof RequestConfig]))
                const x = requestConfigElement[property as keyof RequestConfig]; // includes
            }
        }

        // if (requestConfigElement.peer) compatibility &&= requestConfigElement["content.description"] === request["peer"];
        // if (requestConfigElement.createdAt) compatibility &&= requestConfigElement.createdAt === request.createdAt;
        return compatibility;
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
