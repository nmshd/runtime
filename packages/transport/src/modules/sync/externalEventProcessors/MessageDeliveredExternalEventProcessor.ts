import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSerializable } from "../../../core/CoreSerializable";
import { MessageDeliveredEvent } from "../../../events";
import { Message } from "../../messages/local/Message";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class MessageDeliveredExternalEventData extends CoreSerializable {
    @serialize()
    @validate()
    public id: string;
}

export class MessageDeliveredExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Message> {
        const messageReceivedPayload = MessageDeliveredExternalEventData.fromAny(externalEvent.payload);
        const updatedMessages = await this.accountController.messages.updateCache([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.ownAddress, deliveredMessage));
        return deliveredMessage;
    }
}
