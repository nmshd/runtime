import { EventBus } from "@js-soft/ts-utils";
import { TransportError } from "../../../core";
import { MessageController } from "../../messages/MessageController";
import { RelationshipsController } from "../../relationships/RelationshipsController";
import { ChangedItems } from "../ChangedItems";
import { ExternalEventProcessor } from "./ExternalEventProcessor";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor";
import { RelationshipChangeCompletedExternalEventProcessor } from "./RelationshipChangeCompletedExternalEventProcessor";
import { RelationshipChangeCreatedExternalEventProcessor } from "./RelationshipChangeCreatedExternalEventProcessor";

export class ExternalEventProcessorRegistry {
    private readonly processors = new Map<string, ExternalEventProcessor>();
    public constructor(
        eventBus: EventBus,
        changedItems: ChangedItems,
        ownAddress: string,
        messagesController: MessageController,
        relationshipsController: RelationshipsController
    ) {
        this.registerProcessor("MessageReceived", new MessageReceivedExternalEventProcessor(eventBus, changedItems, ownAddress, messagesController));
        this.registerProcessor("MessageDelivered", new MessageDeliveredExternalEventProcessor(eventBus, changedItems, ownAddress, messagesController));
        this.registerProcessor("RelationshipChangeCreated", new RelationshipChangeCreatedExternalEventProcessor(eventBus, changedItems, ownAddress, relationshipsController));
        this.registerProcessor("RelationshipChangeCompleted", new RelationshipChangeCompletedExternalEventProcessor(eventBus, changedItems, ownAddress, relationshipsController));
    }

    public registerProcessor(externalEventName: string, externalEventProcessor: ExternalEventProcessor): void {
        if (this.processors.has(externalEventName)) {
            throw new TransportError(`There is already a externalEventProcessor registered for '${externalEventName}'. Use 'replaceProcessorForType' if you want to replace it.`);
        }
        this.processors.set(externalEventName, externalEventProcessor);
    }

    public registerOrReplaceProcessor(externalEventName: string, externalEventProcessor: ExternalEventProcessor): void {
        this.processors.set(externalEventName, externalEventProcessor);
    }

    public getProcessorForItem(externalEventName: string): ExternalEventProcessor {
        const externalEventProcessor = this.processors.get(externalEventName);
        if (!externalEventProcessor) {
            throw new TransportError(`There was no processor registered for '${externalEventName}'.`);
        }
        return externalEventProcessor;
    }
}
