import { Message } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class MessageDeliveredEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageDelivered";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageDeliveredEvent.namespace, eventTargetAddress, data);
    }
}
