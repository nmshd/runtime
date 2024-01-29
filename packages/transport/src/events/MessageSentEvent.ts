import { Message } from "../modules/messages/local/Message";
import { TransportDataEvent } from "./TransportDataEvent";

export class MessageSentEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageSent";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageSentEvent.namespace, eventTargetAddress, data);
    }
}
