import { Result } from "@js-soft/ts-utils";
import { DecideRequestItemGroupParametersJSON, DecideRequestItemParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import { RequestItemGroupJSON, RequestItemJSON, RequestItemJSONDerivations } from "@nmshd/content";
import { RuntimeErrors, RuntimeServices } from "..";
import {
    IncomingRequestStatusChangedEvent,
    MessageProcessedEvent,
    MessageProcessedResult,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult
} from "../events";
import { ModuleConfiguration, RuntimeModule } from "../extensibility";
import { LocalRequestDTO } from "../types";
import {
    GeneralRequestConfig,
    isAcceptResponseConfig,
    isDeleteAttributeAcceptResponseConfig,
    isFreeTextAcceptResponseConfig,
    isGeneralRequestConfig,
    isProposeAttributeWithExistingAttributeAcceptResponseConfig,
    isProposeAttributeWithNewAttributeAcceptResponseConfig,
    isReadAttributeWithExistingAttributeAcceptResponseConfig,
    isReadAttributeWithNewAttributeAcceptResponseConfig,
    isRejectResponseConfig,
    isRequestItemDerivationConfig,
    isSimpleAcceptResponseConfig,
    RequestConfig,
    RequestItemDerivationConfig,
    ResponseConfig
} from "./decide";

export interface DeciderModuleConfiguration extends ModuleConfiguration {
    automationConfig?: AutomationConfig[];
}

export type DeciderModuleConfigurationOverwrite = Partial<DeciderModuleConfiguration>;

// TODO: add validation for fitting requestConfig-responseConfig combination (maybe in init or start)
export interface AutomationConfig {
    requestConfig: RequestConfig;
    responseConfig: ResponseConfig;
}

// TODO: check kind of logging throughout file

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

        const automationResult = await this.automaticallyDecideRequest(event);
        if (automationResult.isSuccess) {
            const services = await this.runtime.getServices(event.eventTargetAddress);
            await this.publishEvent(event, services, "RequestAutomaticallyDecided");
        }

        this.logger.error(automationResult.error);
        return await this.requireManualDecision(event);
    }

    public async automaticallyDecideRequest(event: IncomingRequestStatusChangedEvent): Promise<Result<LocalRequestDTO>> {
        if (!this.configuration.automationConfig) return Result.fail(RuntimeErrors.deciderModule.doesNotHaveAutomationConfig());

        const request = event.data.request;
        const itemsOfRequest = request.content.items;

        let decideRequestItemParameters = this.createArrayWithSameDimension(itemsOfRequest, undefined);

        for (const automationConfigElement of this.configuration.automationConfig) {
            const requestConfigElement = automationConfigElement.requestConfig;
            const responseConfigElement = automationConfigElement.responseConfig;

            if (isGeneralRequestConfig(requestConfigElement)) {
                const generalRequestIsCompatible = this.checkGeneralRequestCompatibility(requestConfigElement, request);
                if (generalRequestIsCompatible) {
                    // TODO: return early?
                    const responseConfigIsValid = this.validateResponseConfigCompatibility(requestConfigElement, responseConfigElement);
                    if (!responseConfigIsValid) {
                        this.logger.error(RuntimeErrors.deciderModule.requestConfigDoesNotMatchResponseConfig(requestConfigElement, responseConfigElement));
                        continue;
                    }

                    const applyGeneralResponseConfigResult = await this.applyGeneralResponseConfig(event, responseConfigElement);
                    if (applyGeneralResponseConfigResult.isError) {
                        this.logger.error(applyGeneralResponseConfigResult.error.message);
                        continue;
                    }

                    return applyGeneralResponseConfigResult;
                }
            }

            if (isRequestItemDerivationConfig(requestConfigElement)) {
                const checkCompatibilityResult = this.checkRequestItemCompatibilityAndApplyReponseConfig(
                    itemsOfRequest,
                    decideRequestItemParameters,
                    request,
                    requestConfigElement,
                    responseConfigElement
                );
                if (checkCompatibilityResult.isError) {
                    this.logger.error(checkCompatibilityResult.error);
                    continue;
                }
                decideRequestItemParameters = checkCompatibilityResult.value;
                if (!this.containsDeep(decideRequestItemParameters, (element) => element === undefined)) {
                    const decideRequestResult = await this.decideRequest(event, decideRequestItemParameters);
                    return decideRequestResult;
                }
            }
        }

        return Result.fail(RuntimeErrors.deciderModule.someItemsOfRequestCouldNotBeDecidedAutomatically());
    }

    private checkRequestItemCompatibilityAndApplyReponseConfig(
        itemsOfRequest: (RequestItemJSONDerivations | RequestItemGroupJSON)[],
        parametersToDecideRequest: any[],
        request: LocalRequestDTO,
        requestConfigElement: RequestItemDerivationConfig,
        responseConfigElement: ResponseConfig
    ): Result<ResponseConfig[]> {
        for (let i = 0; i < itemsOfRequest.length; i++) {
            const item = itemsOfRequest[i];
            if (Array.isArray(item)) {
                this.checkRequestItemCompatibilityAndApplyReponseConfig(item, parametersToDecideRequest[i], request, requestConfigElement, responseConfigElement);
            } else {
                if (parametersToDecideRequest[i]) continue; // there was already a fitting config found for this RequestItem
                const requestItemIsCompatible = this.checkRequestItemCompatibility(requestConfigElement, item as RequestItemJSONDerivations);
                if (requestItemIsCompatible) {
                    const generalRequestIsCompatible = this.checkGeneralRequestCompatibility(requestConfigElement, request);
                    if (generalRequestIsCompatible) {
                        const responseConfigIsValid = this.validateResponseConfigCompatibility(requestConfigElement, responseConfigElement);
                        if (!responseConfigIsValid) {
                            return Result.fail(RuntimeErrors.deciderModule.requestConfigDoesNotMatchResponseConfig(requestConfigElement, responseConfigElement));
                        }
                        parametersToDecideRequest[i] = responseConfigElement;
                    }
                }
            }
        }
        return Result.ok(parametersToDecideRequest);
    }

    private createArrayWithSameDimension(array: any[], initialValue: any): any[] {
        return array.map((element) => {
            if (Array.isArray(element)) {
                return this.createArrayWithSameDimension(element, initialValue);
            }
            return initialValue;
        });
    }

    private containsDeep(nestedArray: any[], callback: (element: any) => boolean): boolean {
        return nestedArray.some((element) => (Array.isArray(element) ? this.containsDeep(element, callback) : callback(element)));
    }

    public checkGeneralRequestCompatibility(generalRequestConfigElement: GeneralRequestConfig, request: LocalRequestDTO): boolean {
        return this.checkCompatibility(generalRequestConfigElement, request);
    }

    public checkRequestItemCompatibility(requestItemConfigElement: RequestItemDerivationConfig, requestItem: RequestItemJSONDerivations): boolean {
        const reducedRequestItemConfigElement = this.reduceRequestItemConfigElement(requestItemConfigElement);
        return this.checkCompatibility(reducedRequestItemConfigElement, requestItem);
    }

    private reduceRequestItemConfigElement(requestItemConfigElement: RequestItemDerivationConfig): Record<string, any> {
        const prefix = "content.item.";
        const reducedRequestItemConfigElement: Record<string, any> = {};
        for (const key in requestItemConfigElement) {
            const reducedKey = key.startsWith(prefix) ? key.substring(prefix.length).trim() : key;
            reducedRequestItemConfigElement[reducedKey] = requestItemConfigElement[key as keyof RequestItemDerivationConfig];
        }
        return reducedRequestItemConfigElement;
    }

    private checkCompatibility(requestConfigElement: RequestConfig, requestOrRequestItem: LocalRequestDTO | RequestItemJSONDerivations): boolean {
        let compatible = true;
        for (const property in requestConfigElement) {
            const unformattedRequestConfigProperty = requestConfigElement[property as keyof RequestConfig];
            if (!unformattedRequestConfigProperty) {
                continue;
            }
            const requestConfigProperty = this.makeObjectsToStrings(unformattedRequestConfigProperty);

            const unformattedRequestProperty = this.getNestedProperty(requestOrRequestItem, property);
            if (!unformattedRequestProperty) {
                compatible = false;
                break;
            }
            const requestProperty = this.makeObjectsToStrings(unformattedRequestProperty);

            if (property.endsWith("tags")) {
                compatible &&= this.checkTagCompatibility(requestConfigProperty, requestProperty);
                if (!compatible) break;
                continue;
            }

            if (Array.isArray(requestConfigProperty)) {
                compatible &&= requestConfigProperty.includes(requestProperty);
            } else {
                compatible &&= requestConfigProperty === requestProperty;
            }
            if (!compatible) break;
        }
        return compatible;
    }

    private makeObjectsToStrings(data: any) {
        if (Array.isArray(data)) {
            return data.map((element) => (typeof element === "object" ? JSON.stringify(element) : element));
        }
        if (typeof data === "object") return JSON.stringify(data);
        return data;
    }

    private getNestedProperty(object: any, path: string): any {
        const nestedProperty = path.split(".").reduce((currentObject, key) => currentObject?.[key], object);
        return nestedProperty;
    }

    private checkTagCompatibility(requestConfigTags: string[], requestTags: string[]): boolean {
        const atLeastOneMatchingTag = requestConfigTags.some((tag) => requestTags.includes(tag));
        return atLeastOneMatchingTag;
    }

    // TODO: check if this can be done earlier
    public validateResponseConfigCompatibility(requestConfig: RequestConfig, responseConfig: ResponseConfig): boolean {
        if (isRejectResponseConfig(responseConfig)) return true;

        if (isGeneralRequestConfig(requestConfig)) return isSimpleAcceptResponseConfig(responseConfig);

        switch (requestConfig["content.item.@type"]) {
            case "DeleteAttributeRequestItem":
                return isDeleteAttributeAcceptResponseConfig(responseConfig);
            case "FreeTextRequestItem":
                return isFreeTextAcceptResponseConfig(responseConfig);
            case "ProposeAttributeRequestItem":
                return isProposeAttributeWithExistingAttributeAcceptResponseConfig(responseConfig) || isProposeAttributeWithNewAttributeAcceptResponseConfig(responseConfig);
            case "ReadAttributeRequestItem":
                return isReadAttributeWithExistingAttributeAcceptResponseConfig(responseConfig) || isReadAttributeWithNewAttributeAcceptResponseConfig(responseConfig);
            default:
                return isSimpleAcceptResponseConfig(responseConfig);
        }
    }

    private async applyGeneralResponseConfig(event: IncomingRequestStatusChangedEvent, responseConfigElement: ResponseConfig): Promise<Result<LocalRequestDTO>> {
        if (!(isRejectResponseConfig(responseConfigElement) || isSimpleAcceptResponseConfig(responseConfigElement))) {
            return Result.fail(RuntimeErrors.deciderModule.responseConfigDoesNotMatchRequest(responseConfigElement, event.data.request));
        }

        const request = event.data.request;
        const decideRequestItemParameters = this.createArrayWithSameDimension(request.content.items, responseConfigElement);

        const decideRequestResult = await this.decideRequest(event, decideRequestItemParameters);
        return decideRequestResult;
    }

    private async decideRequest(
        event: IncomingRequestStatusChangedEvent,
        decideRequestItemParameters: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
    ): Promise<Result<LocalRequestDTO>> {
        const services = await this.runtime.getServices(event.eventTargetAddress);
        const request = event.data.request;

        if (!this.containsDeep(decideRequestItemParameters, isAcceptResponseConfig)) {
            const canRejectResult = await services.consumptionServices.incomingRequests.canReject({ requestId: request.id, items: decideRequestItemParameters });
            if (canRejectResult.isError) {
                return Result.fail(RuntimeErrors.deciderModule.canRejectRequestFailed(request.id, canRejectResult.error.message));
            }

            const rejectResult = await services.consumptionServices.incomingRequests.reject({ requestId: request.id, items: decideRequestItemParameters });
            if (rejectResult.isError) {
                return Result.fail(RuntimeErrors.deciderModule.rejectRequestFailed(request.id, rejectResult.error.message));
            }

            const localRequestWithResponse = rejectResult.value;
            return Result.ok(localRequestWithResponse);
        }

        const canAcceptResult = await services.consumptionServices.incomingRequests.canAccept({ requestId: request.id, items: decideRequestItemParameters });
        if (canAcceptResult.isError) {
            return Result.fail(RuntimeErrors.deciderModule.canAcceptRequestFailed(request.id, canAcceptResult.error.message));
        }

        const acceptResult = await services.consumptionServices.incomingRequests.accept({ requestId: request.id, items: decideRequestItemParameters });
        if (acceptResult.isError) {
            return Result.fail(RuntimeErrors.deciderModule.acceptRequestFailed(request.id, acceptResult.error.message));
        }

        const localRequestWithResponse = acceptResult.value;
        return Result.ok(localRequestWithResponse);
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

        await this.publishEvent(event, services, "ManualRequestDecisionRequired");
    }

    private async publishEvent(
        event: IncomingRequestStatusChangedEvent,
        services: RuntimeServices,
        result: keyof typeof RelationshipTemplateProcessedResult & keyof typeof MessageProcessedResult
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
                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                            template,
                            result: result as RelationshipTemplateProcessedResult.ManualRequestDecisionRequired,
                            requestId: request.id
                        })
                    );
                }

                if (result === "RequestAutomaticallyDecided") {
                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                            template,
                            result: result as RelationshipTemplateProcessedResult.RequestAutomaticallyDecided,
                            requestId: request.id
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
