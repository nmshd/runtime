import { EventBus } from "@js-soft/ts-utils";
import { MessageDeliveredEvent } from "../../../events";
import { MessageController } from "../../messages/MessageController";
import { ChangedItems } from "../ChangedItems";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class MessageDeliveredEventProcessor extends ExternalEventProcessor {
    public constructor(
        eventBus: EventBus,
        changedItems: ChangedItems,
        ownAddress: string,
        private readonly messagesController: MessageController
    ) {
        super(eventBus, changedItems, ownAddress);
    }

    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const messageReceivedPayload = externalEvent.payload as { id: string };
        const updatedMessages = await this.messagesController.updateCache([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.ownAddress, deliveredMessage));
        this.changedItems.addMessage(deliveredMessage);
    }
}
