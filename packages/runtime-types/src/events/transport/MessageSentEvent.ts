import { MessageDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class MessageSentEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageSent";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageSentEvent.namespace, eventTargetAddress, data);
    }
}
