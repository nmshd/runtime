import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { MessageDeliveredEvent } from "../../../events/index.js";
import { Message } from "../../messages/local/Message.js";
import { ExternalEvent } from "../data/ExternalEvent.js";
import { ExternalEventProcessor } from "./ExternalEventProcessor.js";

class MessageDeliveredExternalEventData extends Serializable {
    @serialize()
    @validate()
    public id: string;
}

export class MessageDeliveredExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Message> {
        const messageReceivedPayload = MessageDeliveredExternalEventData.fromAny(externalEvent.payload);
        const updatedMessages = await this.accountController.messages.updateBackboneData([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.ownAddress, deliveredMessage));
        return deliveredMessage;
    }
}
