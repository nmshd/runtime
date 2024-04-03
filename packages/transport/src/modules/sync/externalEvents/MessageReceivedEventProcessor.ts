import { EventBus } from "@js-soft/ts-utils";
import { CoreId } from "../../../core";
import { MessageReceivedEvent } from "../../../events";
import { MessageController } from "../../messages/MessageController";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ChangedItems } from "../ChangedItems";
import { ExternalEventProcessor } from "./AbstractExternalEventProcessor";

export class MessageReceivedEventProcessor extends ExternalEventProcessor {
    public constructor(
        eventBus: EventBus,
        changedItems: ChangedItems,
        ownAddress: string,
        private readonly messagesController: MessageController
    ) {
        super(eventBus, changedItems, ownAddress);
    }

    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const newMessagePayload = externalEvent.payload as { id: string };
        const newMessage = await this.messagesController.loadPeerMessage(CoreId.from(newMessagePayload.id));

        this.eventBus.publish(new MessageReceivedEvent(this.ownAddress, newMessage));
        this.changedItems.addMessage(newMessage);
    }
}
