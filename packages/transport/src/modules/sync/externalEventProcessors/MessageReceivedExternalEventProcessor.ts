import { CoreId } from "../../../core";
import { MessageReceivedEvent } from "../../../events";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class MessageReceivedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const newMessagePayload = externalEvent.payload as { id: string };
        const newMessage = await this.accountController.messages.loadPeerMessage(CoreId.from(newMessagePayload.id));

        this.eventBus.publish(new MessageReceivedEvent(this.accountController.identity.address.toString(), newMessage));
        this.changedItems.addMessage(newMessage);
    }
}
