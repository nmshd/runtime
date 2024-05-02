import { Message } from "../modules/messages/local/Message";
import { TransportDataEvent } from "./TransportDataEvent";

export class MessageRecipientDeletedEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageRecipientDeleted";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageRecipientDeletedEvent.namespace, eventTargetAddress, data);
    }
}
