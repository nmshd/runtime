import { EventBus } from "@js-soft/ts-utils";
import { MessageController } from "../../messages/MessageController";
import { RelationshipsController } from "../../relationships/RelationshipsController";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ChangedItems } from "../ChangedItems";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor";
import { RelationshipChangeCompletedExternalEventProcessor } from "./RelationshipChangeCompletedExternalEventProcessor";
import { RelationshipChangeCreatedExternalEventProcessor } from "./RelationshipChangeCreatedExternalEventProcessor";

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly changedItems: ChangedItems,
        protected readonly ownAddress: string
    ) {}
    public abstract execute(externalEvent: BackboneExternalEvent): Promise<void>;

    public static getExternalEventProcessorRegistry(
        eventBus: EventBus,
        changedItems: ChangedItems,
        ownAddress: string,
        messagesController: MessageController,
        relationshipsController: RelationshipsController
    ): Map<string, ExternalEventProcessor> {
        const externalEventProcessorRegistry: Map<string, ExternalEventProcessor> = new Map();

        externalEventProcessorRegistry.set("MessageReceived", new MessageReceivedExternalEventProcessor(eventBus, changedItems, ownAddress, messagesController));
        externalEventProcessorRegistry.set("MessageDelivered", new MessageDeliveredExternalEventProcessor(eventBus, changedItems, ownAddress, messagesController));
        externalEventProcessorRegistry.set(
            "RelationshipChangeCreated",
            new RelationshipChangeCreatedExternalEventProcessor(eventBus, changedItems, ownAddress, relationshipsController)
        );
        externalEventProcessorRegistry.set(
            "RelationshipChangeCompleted",
            new RelationshipChangeCompletedExternalEventProcessor(eventBus, changedItems, ownAddress, relationshipsController)
        );
        return externalEventProcessorRegistry;
    }
}
