import { Message } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class MessageSentEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageSent";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageSentEvent.namespace, eventTargetAddress, data);
    }
}
