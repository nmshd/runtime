import { Message } from "../modules";
import { TransportDataEvent } from "./TransportDataEvent";

export class MessageWasReadAtChangedEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageWasReadAtChanged";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageWasReadAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
