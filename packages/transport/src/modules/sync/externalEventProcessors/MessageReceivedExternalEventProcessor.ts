import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "../../../core";
import { MessageReceivedEvent } from "../../../events";
import { Message } from "../../messages/local/Message";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class MessageReceivedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public id: string;
}

export class MessageReceivedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<Message> {
        const newMessagePayload = MessageReceivedExternalEventData.fromAny(externalEvent.payload);
        const newMessage = await this.accountController.messages.loadPeerMessage(CoreId.from(newMessagePayload.id));

        this.eventBus.publish(new MessageReceivedEvent(this.ownAddress, newMessage));
        return newMessage;
    }
}
