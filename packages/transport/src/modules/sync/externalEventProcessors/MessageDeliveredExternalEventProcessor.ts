import { MessageDeliveredEvent } from "../../../events";
import { Message } from "../../messages/local/Message";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class MessageDeliveredExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Message> {
        const messageReceivedPayload = externalEvent.payload as { id: string };
        const updatedMessages = await this.accountController.messages.updateCache([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.getAddress(), deliveredMessage));
        return deliveredMessage;
    }
}
