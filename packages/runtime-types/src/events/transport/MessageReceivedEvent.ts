import { MessageDTO } from "../../dtos";
import { DataEvent } from "../DataEvent";

export class MessageReceivedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageReceived";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageReceivedEvent.namespace, eventTargetAddress, data);
    }
}
