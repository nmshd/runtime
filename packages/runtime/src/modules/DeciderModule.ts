import { ApplicationError } from "@js-soft/ts-utils";
import { LocalRequestStatus } from "@nmshd/consumption";
import { isRequestItemDerivation, RequestItemGroupJSON, RequestItemJSONDerivations } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
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
import { RuntimeErrors } from "../useCases/common/RuntimeErrors";
import {
    isAcceptResponseConfig,
    isDeleteAttributeAcceptResponseConfig,
    isFreeTextAcceptResponseConfig,
    isGeneralRequestConfig,
    isProposeAttributeWithNewAttributeAcceptResponseConfig,
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

export interface AutomationConfig {
    requestConfig: RequestConfig;
    responseConfig: ResponseConfig;
}

export class DeciderModule extends RuntimeModule<DeciderModuleConfiguration> {
    public init(): void {
        if (!this.configuration.automationConfig) return;

        for (const automationConfigElement of this.configuration.automationConfig) {
            const isCompatible = this.validateAutomationConfig(automationConfigElement.requestConfig, automationConfigElement.responseConfig);
            if (!isCompatible) {
                throw RuntimeErrors.deciderModule.requestConfigDoesNotMatchResponseConfig();
            }
        }
    }

    private validateAutomationConfig(requestConfig: RequestConfig, responseConfig: ResponseConfig): boolean {
        if (isRejectResponseConfig(responseConfig)) return true;

        if (isGeneralRequestConfig(requestConfig)) return isSimpleAcceptResponseConfig(responseConfig);

        switch (requestConfig["content.item.@type"]) {
            case "DeleteAttributeRequestItem":
                return isDeleteAttributeAcceptResponseConfig(responseConfig);
            case "FreeTextRequestItem":
                return isFreeTextAcceptResponseConfig(responseConfig);
            case "ProposeAttributeRequestItem":
                return isProposeAttributeWithNewAttributeAcceptResponseConfig(responseConfig);
            case "ReadAttributeRequestItem":
                return isReadAttributeWithNewAttributeAcceptResponseConfig(responseConfig);
            default:
                return isSimpleAcceptResponseConfig(responseConfig);
        }
    }

    public start(): void {
        this.subscribeToEvent(IncomingRequestStatusChangedEvent, this.handleIncomingRequestStatusChanged.bind(this));
    }

    private async handleIncomingRequestStatusChanged(event: IncomingRequestStatusChangedEvent) {
        if (event.data.newStatus !== LocalRequestStatus.DecisionRequired) return;

        const requestContent = event.data.request.content;
        if (containsItem(requestContent, (item) => item["requireManualDecision"] === true)) {
            return await this.requireManualDecision(event);
        }

        const automaticallyDecided = (await this.automaticallyDecideRequest(event)).wasDecided;
        if (automaticallyDecided) {
            const services = await this.runtime.getServices(event.eventTargetAddress);
            await this.publishEvent(event, services, "RequestAutomaticallyDecided");
            return;
        }

        return await this.requireManualDecision(event);
    }

    private async automaticallyDecideRequest(event: IncomingRequestStatusChangedEvent): Promise<{ wasDecided: boolean }> {
        if (!this.configuration.automationConfig) return { wasDecided: false };

        const request = event.data.request;
        const itemsOfRequest = request.content.items;

        let decideRequestItemParameters = createEmptyDecideRequestItemParameters(itemsOfRequest);

        for (const automationConfigElement of this.configuration.automationConfig) {
            const requestConfigElement = automationConfigElement.requestConfig;
            const responseConfigElement = automationConfigElement.responseConfig;

            const services = await this.runtime.getServices(event.eventTargetAddress);
            const generalRequestIsCompatible = await checkGeneralRequestCompatibility(requestConfigElement, request, services);

            if (generalRequestIsCompatible instanceof Error) {
                this.logger.error(generalRequestIsCompatible);
                break;
            }

            if (!generalRequestIsCompatible) {
                continue;
            }

            const updatedRequestItemParameters = await checkRequestItemCompatibilityAndApplyResponseConfig(
                itemsOfRequest,
                decideRequestItemParameters,
                requestConfigElement,
                responseConfigElement
            );

            decideRequestItemParameters = updatedRequestItemParameters;

            const allItemsAutomaticallyDecided = !containsItem(decideRequestItemParameters, (element) => element === undefined);
            if (allItemsAutomaticallyDecided) {
                const decideRequestResult = await this.decideRequest(event, decideRequestItemParameters);
                return decideRequestResult;
            }
        }

        this.logger.info("The Request couldn't be decided automatically, since it contains RequestItems for which no suitable automationConfig was provided.");
        return { wasDecided: false };
    }

    private async decideRequest(event: IncomingRequestStatusChangedEvent, decideRequestItemParameters: { items: any[] }): Promise<{ wasDecided: boolean }> {
        const services = await this.runtime.getServices(event.eventTargetAddress);
        const request = event.data.request;

        const allItemsRejected = !containsItem(decideRequestItemParameters, isAcceptResponseConfig);
        if (allItemsRejected) {
            return await this.rejectRequest(services, request, decideRequestItemParameters);
        }

        return await this.acceptRequest(services, request, decideRequestItemParameters);
    }

    private async rejectRequest(services: RuntimeServices, request: LocalRequestDTO, decideRequestItemParameters: { items: any[] }): Promise<{ wasDecided: boolean }> {
        const canRejectResult = await services.consumptionServices.incomingRequests.canReject({ requestId: request.id, items: decideRequestItemParameters.items });
        if (canRejectResult.isError) {
            this.logger.error(`Can not reject Request ${request.id}`, canRejectResult.value.code, canRejectResult.error);
            return { wasDecided: false };
        } else if (!canRejectResult.value.isSuccess) {
            this.logger.warn(`Can not reject Request ${request.id}`, canRejectResult.value.code, canRejectResult.value.message);
            return { wasDecided: false };
        }

        const rejectResult = await services.consumptionServices.incomingRequests.reject({ requestId: request.id, items: decideRequestItemParameters.items });
        if (rejectResult.isError) {
            this.logger.error(`An error occured trying to reject Request ${request.id}`, rejectResult.error);
            return { wasDecided: false };
        }

        await services.consumptionServices.incomingRequests.setWasAutomaticallyDecided({ id: request.id });
        return { wasDecided: true };
    }

    private async acceptRequest(services: RuntimeServices, request: LocalRequestDTO, decideRequestItemParameters: { items: any[] }): Promise<{ wasDecided: boolean }> {
        const canAcceptResult = await services.consumptionServices.incomingRequests.canAccept({ requestId: request.id, items: decideRequestItemParameters.items });
        if (canAcceptResult.isError) {
            this.logger.error(`Can not accept Request ${request.id}.`, canAcceptResult.error);
            return { wasDecided: false };
        } else if (!canAcceptResult.value.isSuccess) {
            this.logger.warn(`Can not accept Request ${request.id}.`, canAcceptResult.value.message);
            return { wasDecided: false };
        }

        const acceptResult = await services.consumptionServices.incomingRequests.accept({ requestId: request.id, items: decideRequestItemParameters.items });
        if (acceptResult.isError) {
            this.logger.error(`An error occured trying to accept Request ${request.id}`, acceptResult.error);
            return { wasDecided: false };
        }

        await services.consumptionServices.incomingRequests.setWasAutomaticallyDecided({ id: request.id });
        return { wasDecided: true };
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
        const requestId = request.id;

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
                            requestId
                        })
                    );
                }

                if (result === "RequestAutomaticallyDecided") {
                    this.runtime.eventBus.publish(
                        new RelationshipTemplateProcessedEvent(event.eventTargetAddress, {
                            template,
                            result: result as RelationshipTemplateProcessedResult.RequestAutomaticallyDecided,
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
}

function containsItem(objectWithItems: { items: any[] }, callback: (element: any) => boolean): boolean {
    const items = objectWithItems.items;

    return items.some((item) => {
        if (item?.hasOwnProperty("items")) {
            return containsItem(item, callback);
        }
        return callback(item);
    });
}

function createEmptyDecideRequestItemParameters(array: any[]): { items: any[] } {
    return {
        items: array.map((element) => {
            if (element["@type"] === "RequestItemGroup") {
                const responseItems = createEmptyDecideRequestItemParameters(element.items);
                return responseItems;
            }
            return undefined;
        })
    };
}

async function checkGeneralRequestCompatibility(requestConfigElement: RequestConfig, request: LocalRequestDTO, services: RuntimeServices): Promise<boolean | Error> {
    let generalRequestPartOfConfigElement = requestConfigElement;

    if (isRequestItemDerivationConfig(requestConfigElement)) {
        generalRequestPartOfConfigElement = filterConfigElementByPrefix(requestConfigElement, false);
    }

    return await checkCompatibility(generalRequestPartOfConfigElement, request, services);
}

function filterConfigElementByPrefix(requestItemConfigElement: RequestItemDerivationConfig, includePrefix: boolean): Record<string, any> {
    const prefix = "content.item.";

    const filteredRequestItemConfigElement: Record<string, any> = {};
    for (const key in requestItemConfigElement) {
        const startsWithPrefix = key.startsWith(prefix);

        if (includePrefix && startsWithPrefix) {
            const reducedKey = key.substring(prefix.length).trim();
            filteredRequestItemConfigElement[reducedKey] = requestItemConfigElement[key as keyof RequestItemDerivationConfig];
        } else if (!includePrefix && !startsWithPrefix) {
            filteredRequestItemConfigElement[key] = requestItemConfigElement[key as keyof RequestItemDerivationConfig];
        }
    }
    return filteredRequestItemConfigElement;
}

async function checkCompatibility(requestConfigElement: RequestConfig, requestOrRequestItem: LocalRequestDTO, services: RuntimeServices): Promise<boolean | Error>;
async function checkCompatibility(requestConfigElement: RequestConfig, requestOrRequestItem: RequestItemJSONDerivations): Promise<boolean>;
async function checkCompatibility(
    requestConfigElement: RequestConfig,
    requestOrRequestItem: LocalRequestDTO | RequestItemJSONDerivations,
    services?: RuntimeServices
): Promise<boolean | Error> {
    let compatible = true;

    for (const property in requestConfigElement) {
        const unformattedRequestConfigProperty = requestConfigElement[property as keyof RequestConfig];
        if (unformattedRequestConfigProperty === undefined) {
            continue;
        }

        const requestConfigProperty = makeObjectsToStrings(unformattedRequestConfigProperty);

        if (property === "relationshipAlreadyExists") {
            if (isRequestItemDerivation(requestOrRequestItem)) {
                return Error("The RelationshipRequestConfig 'relationshipAlreadyExists' is compared to a RequestItem, but should be compared to a Request.");
            }

            const relationshipCompatibility = await checkRelationshipCompatibility(requestConfigProperty, requestOrRequestItem as LocalRequestDTO, services!);
            if (relationshipCompatibility instanceof ApplicationError) return relationshipCompatibility;

            compatible &&= relationshipCompatibility;
            if (!compatible) break;
            continue;
        }

        const unformattedRequestProperty = getNestedProperty(requestOrRequestItem, property);
        if (unformattedRequestProperty === undefined) {
            compatible = false;
            break;
        }
        const requestProperty = makeObjectsToStrings(unformattedRequestProperty);

        if (property.endsWith("tags")) {
            compatible &&= checkTagCompatibility(requestConfigProperty, requestProperty);
            if (!compatible) break;
            continue;
        }

        if (property.endsWith("At") || property.endsWith("From") || property.endsWith("To")) {
            compatible &&= checkDatesCompatibility(requestConfigProperty, requestProperty);
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

function makeObjectsToStrings(data: any) {
    if (Array.isArray(data)) {
        return data.map((element) => (typeof element === "object" ? JSON.stringify(element) : element));
    }
    if (typeof data === "object") return JSON.stringify(data);
    return data;
}

function getNestedProperty(object: any, path: string): any {
    const nestedProperty = path.split(".").reduce((currentObject, key) => currentObject?.[key], object);
    return nestedProperty;
}

async function checkRelationshipCompatibility(relationshipRequestConfig: boolean, request: LocalRequestDTO, services: RuntimeServices): Promise<boolean | ApplicationError> {
    let relationshipExists = false;

    const relationshipResult = await services.transportServices.relationships.getRelationshipByAddress({ address: request.peer });
    if (relationshipResult.isError && relationshipResult.error.code !== "error.runtime.recordNotFound") return relationshipResult.error;

    if (relationshipResult.isSuccess) {
        relationshipExists = true;
    }

    const compatible = relationshipExists === relationshipRequestConfig;
    return compatible;
}

function checkTagCompatibility(requestConfigTags: string[], requestTags: string[]): boolean {
    const atLeastOneMatchingTag = requestConfigTags.some((tag) => requestTags.includes(tag));
    return atLeastOneMatchingTag;
}

function checkDatesCompatibility(requestConfigDates: string | string[], requestDate: string): boolean {
    if (typeof requestConfigDates === "string") return checkDateCompatibility(requestConfigDates, requestDate);
    return requestConfigDates.every((requestConfigDate) => checkDateCompatibility(requestConfigDate, requestDate));
}

function checkDateCompatibility(requestConfigDate: string, requestDate: string): boolean {
    if (requestConfigDate.startsWith(">")) return CoreDate.from(requestDate).isAfter(CoreDate.from(requestConfigDate.substring(1)));
    if (requestConfigDate.startsWith("<")) return CoreDate.from(requestDate).isBefore(CoreDate.from(requestConfigDate.substring(1)));
    return CoreDate.from(requestDate).equals(CoreDate.from(requestConfigDate));
}

async function checkRequestItemCompatibilityAndApplyResponseConfig(
    itemsOfRequest: (RequestItemJSONDerivations | RequestItemGroupJSON)[],
    parametersToDecideRequest: any,
    requestConfigElement: RequestItemDerivationConfig,
    responseConfigElement: ResponseConfig
): Promise<{ items: any[] }> {
    for (let i = 0; i < itemsOfRequest.length; i++) {
        const item = itemsOfRequest[i];
        if (item["@type"] === "RequestItemGroup") {
            await checkRequestItemCompatibilityAndApplyResponseConfig(
                (item as RequestItemGroupJSON).items,
                parametersToDecideRequest.items[i],
                requestConfigElement,
                responseConfigElement
            );
        } else {
            const alreadyDecidedByOtherConfig = !!parametersToDecideRequest.items[i];
            if (alreadyDecidedByOtherConfig) continue;

            if (isRequestItemDerivationConfig(requestConfigElement)) {
                const requestItemIsCompatible = await checkRequestItemCompatibility(requestConfigElement, item as RequestItemJSONDerivations);
                if (!requestItemIsCompatible) continue;
            }

            if (isGeneralRequestConfig(requestConfigElement) && responseConfigElement.accept) {
                const requestItemsWithSimpleAccept = [
                    "AuthenticationRequestItem",
                    "ConsentRequestItem",
                    "CreateAttributeRequestItem",
                    "RegisterAttributeListenerRequestItem",
                    "ShareAttributeRequestItem"
                ];
                if (!requestItemsWithSimpleAccept.includes(item["@type"])) continue;
            }

            parametersToDecideRequest.items[i] = responseConfigElement;
        }
    }
    return parametersToDecideRequest;
}

async function checkRequestItemCompatibility(requestConfigElement: RequestItemDerivationConfig, requestItem: RequestItemJSONDerivations): Promise<boolean> {
    const requestItemPartOfConfigElement = filterConfigElementByPrefix(requestConfigElement, true);
    return await checkCompatibility(requestItemPartOfConfigElement, requestItem);
}
