import { RelationshipAttributeConfidentiality, ShareAttributeRequestItemJSON } from "@nmshd/content";
import { AttributeCreatedEvent, AttributeListenerTriggeredEvent } from "../events";
import { RuntimeModule } from "../extensibility";
import { RuntimeServices } from "../Runtime";
import { LocalAttributeDTO, LocalAttributeListenerDTO } from "../types";

export class AttributeListenerModule extends RuntimeModule {
    public init(): void {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(AttributeCreatedEvent, this.handleAttributeCreated.bind(this));
    }

    private async handleAttributeCreated(event: AttributeCreatedEvent) {
        const services = await this.runtime.getServices(event.eventTargetAddress);

        const createdAttribute = event.data;
        if (createdAttribute.content["@type"] === "IdentityAttribute" && createdAttribute.shareInfo) return;
        if (createdAttribute.content["@type"] === "RelationshipAttribute" && createdAttribute.content.confidentiality === RelationshipAttributeConfidentiality.Private) return;

        const getAttributeListenersResult = await services.consumptionServices.attributeListeners.getAttributeListeners();
        if (getAttributeListenersResult.isError) {
            this.logger.error("Could not get attribute listeners", getAttributeListenersResult.error);
            return;
        }

        const attributeListeners = getAttributeListenersResult.value;
        const promises = attributeListeners.map((attributeListener) =>
            this.createRequestIfAttributeMatchesQuery(services, attributeListener, event.data, event.eventTargetAddress)
        );
        await Promise.all(promises);
    }

    private async createRequestIfAttributeMatchesQuery(
        services: RuntimeServices,
        attributeListener: LocalAttributeListenerDTO,
        attribute: LocalAttributeDTO,
        eventTargetAddress: string
    ) {
        const matches = await this.doesAttributeMatchQuery(services, attributeListener, attribute);
        if (!matches) return;

        const requestItem: ShareAttributeRequestItemJSON = {
            "@type": "ShareAttributeRequestItem",
            attribute: attribute.content,
            sourceAttributeId: attribute.id,
            mustBeAccepted: true,
            metadata: { attributeListenerId: attributeListener.id }
        };

        const validationResult = await services.consumptionServices.outgoingRequests.canCreate({
            content: { items: [requestItem] },
            peer: attributeListener.peer
        });
        if (!validationResult.value.isSuccess) {
            this.logger.error("Could not validate outgoing request", validationResult.value);
            return;
        }

        const requestCreatedResult = await services.consumptionServices.outgoingRequests.create({
            content: { items: [requestItem] },
            peer: attributeListener.peer
        });

        if (requestCreatedResult.isError) {
            this.logger.error("Could not create request", requestCreatedResult.error);
            return;
        }

        this.runtime.eventBus.publish(
            new AttributeListenerTriggeredEvent(eventTargetAddress, {
                attributeListener: attributeListener,
                attribute: attribute,
                request: requestCreatedResult.value
            })
        );
    }

    private async doesAttributeMatchQuery(services: RuntimeServices, attributeListener: LocalAttributeListenerDTO, attribute: LocalAttributeDTO) {
        const query = attributeListener.query;
        switch (query["@type"]) {
            case "IdentityAttributeQuery": {
                if (attribute.content["@type"] !== "IdentityAttribute") return false;

                const result = await services.consumptionServices.attributes.executeIdentityAttributeQuery({ query });
                if (result.isError) {
                    this.logger.error("Could not execute IdentityAttributeQuery", result.error);
                    return false;
                }

                return !!result.value.find((a) => a.id === attribute.id);
            }

            case "ThirdPartyRelationshipAttributeQuery": {
                if (attribute.content["@type"] !== "RelationshipAttribute") return false;

                const result = await services.consumptionServices.attributes.executeThirdPartyRelationshipAttributeQuery({ query });
                if (result.isError) {
                    this.logger.error("Could not execute ThirdPartyRelationshipAttributeQuery", result.error);
                    return false;
                }

                return result.value.some((value) => value.id === attribute.id);
            }
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
