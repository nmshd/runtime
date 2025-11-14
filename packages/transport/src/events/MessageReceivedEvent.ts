import { Message } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class MessageReceivedEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageReceived";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageReceivedEvent.namespace, eventTargetAddress, data);
    }
}
