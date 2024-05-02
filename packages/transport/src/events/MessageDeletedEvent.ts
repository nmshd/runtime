import { Message } from "../modules/messages/local/Message";
import { TransportDataEvent } from "./TransportDataEvent";

export class MessageDeletedEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageDeleted";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageDeletedEvent.namespace, eventTargetAddress, data);
    }
}
