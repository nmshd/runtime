import { MessageDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class MessageWasReadAtChangedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageWasReadAtChanged";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageWasReadAtChangedEvent.namespace, eventTargetAddress, data);
    }
}
