import { MessageDeliveredEvent } from "../../../events";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class MessageDeliveredExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<void> {
        const messageReceivedPayload = externalEvent.payload as { id: string };
        const updatedMessages = await this.accountController.messages.updateCache([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.accountController.identity.address.toString(), deliveredMessage));
        this.changedItems.addMessage(deliveredMessage);
    }
}
