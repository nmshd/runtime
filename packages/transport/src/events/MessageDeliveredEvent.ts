import { Message } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class MessageDeliveredEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageDelivered";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageDeliveredEvent.namespace, eventTargetAddress, data);
    }
}
