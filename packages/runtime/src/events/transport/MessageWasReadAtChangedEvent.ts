import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class MessageWasReadAtChangedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageWasReadAtChanged";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageWasReadAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
