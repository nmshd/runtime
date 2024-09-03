import { LocalRequestStatus, LocalResponse } from "@nmshd/consumption";
import { RequestItemGroupJSON, RequestItemJSON, RequestItemJSONDerivations } from "@nmshd/content";
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
import { GeneralRequestConfig, isGeneralRequestConfig, isRequestItemDerivationConfig, RequestConfig, RequestItemDerivationConfig, ResponseConfig } from "./decide";

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
        const automationResult = this.tryToAutomaticallyDecideRequest(event.data.request);
        if (automationResult.automaticallyDecided) {
            // TODO: move request to status Decided and return
        }

        return await this.requireManualDecision(event);
    }

    public tryToAutomaticallyDecideRequest(request: LocalRequestDTO): { automaticallyDecided: boolean; response?: LocalResponse } {
        if (!this.configuration.automationConfig) return { automaticallyDecided: false };

        const requestItems = this.getRequestItemsFromRequest(request);
        const requestItemIsAutomaticallyDecidable = Array(requestItems.length).fill(false);

        for (const automationConfigElement of this.configuration.automationConfig) {
            const requestConfigElement = automationConfigElement.requestConfig;
            const responseConfigElement = automationConfigElement.responseConfig;

            if (isGeneralRequestConfig(requestConfigElement)) {
                const generalRequestIsCompatible = this.checkGeneralRequestCompatibility(requestConfigElement, request);
                if (generalRequestIsCompatible) {
                    // TODO: apply ResponseConfig, check if it's valid, return response
                    return { automaticallyDecided: true };
                }
            }

            if (isRequestItemDerivationConfig(requestConfigElement)) {
                for (let i = 0; i < requestItems.length; i++) {
                    const requestItemIsCompatible = this.checkRequestItemCompatibility(requestConfigElement, requestItems[i]);
                    if (requestItemIsCompatible) {
                        const generalRequestIsCompatible = this.checkGeneralRequestCompatibility(requestConfigElement, request);
                        if (generalRequestIsCompatible) {
                            requestItemIsAutomaticallyDecidable[i] = true;
                            // TODO: apply ResponseConfig, check if it's valid, store response
                        }
                    }
                }
            }
        }

        if (requestItemIsAutomaticallyDecidable.some((value) => value === false)) return { automaticallyDecided: false };

        // TODO: create Response and return it
        return { automaticallyDecided: true };
    }

    private getRequestItemsFromRequest(request: LocalRequestDTO): RequestItemJSONDerivations[] {
        const requestItems = [];

        const itemsOfRequest = request.content.items.filter((item) => item["@type"] !== "RequestItemGroup") as RequestItemJSONDerivations[];
        requestItems.push(...itemsOfRequest);

        const itemGroupsOfRequest = request.content.items.filter((item) => item["@type"] === "RequestItemGroup") as RequestItemGroupJSON[];
        for (const itemGroup of itemGroupsOfRequest) {
            requestItems.push(...itemGroup.items);
        }

        return requestItems;
    }

    public checkGeneralRequestCompatibility(generalRequestConfigElement: GeneralRequestConfig, request: LocalRequestDTO): boolean {
        return this.checkCompatibility(generalRequestConfigElement, request);
    }

    public checkRequestItemCompatibility(requestItemConfigElement: RequestItemDerivationConfig, requestItem: RequestItemJSONDerivations): boolean {
        return this.checkCompatibility(requestItemConfigElement, requestItem);
    }

    private checkCompatibility(requestConfigElement: RequestConfig, requestOrRequestItem: LocalRequestDTO | RequestItemJSONDerivations): boolean {
        let compatibility = true;
        for (const property in requestConfigElement) {
            const unformattedRequestConfigProperty = requestConfigElement[property as keyof RequestConfig];
            if (!unformattedRequestConfigProperty) {
                continue;
            }
            const requestConfigProperty = this.makeStringWithSameDimension(unformattedRequestConfigProperty);

            const requestProperty = this.getNestedPropertyAsString(requestOrRequestItem, property);
            if (!requestProperty) {
                compatibility = false;
                break;
            }

            if (typeof requestConfigProperty === "string") {
                compatibility &&= requestConfigProperty === requestProperty;
            } else {
                compatibility &&= requestConfigProperty.includes(requestProperty);
            }

            if (!compatibility) break;
        }
        return compatibility;
    }

    // TODO: this feels hacky
    private getNestedPropertyAsString(object: any, path: string): string {
        const nestedProperty = path.split(".").reduce((currentObject, key) => currentObject?.[key], object);
        const nestedPropertyAsStringWithSameDimension = this.makeStringWithSameDimension(nestedProperty);
        if (typeof nestedPropertyAsStringWithSameDimension === "string") return nestedPropertyAsStringWithSameDimension;
        return JSON.stringify(nestedPropertyAsStringWithSameDimension);
    }

    private makeStringWithSameDimension(data: any): string | string[] {
        if (typeof data === "string") return data;
        if (Array.isArray(data)) {
            return data.map((element) => (typeof element === "string" ? element : JSON.stringify(element)));
        }
        return JSON.stringify(data);
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
