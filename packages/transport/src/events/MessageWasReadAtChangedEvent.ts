import { Message } from "../modules/index.js";
import { TransportDataEvent } from "./TransportDataEvent.js";

export class MessageWasReadAtChangedEvent extends TransportDataEvent<Message> {
    public static readonly namespace = "transport.messageWasReadAtChanged";

    public constructor(eventTargetAddress: string, data: Message) {
        super(MessageWasReadAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
