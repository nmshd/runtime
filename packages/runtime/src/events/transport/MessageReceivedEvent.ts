import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class MessageReceivedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageReceived";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageReceivedEvent.namespace, eventTargetAddress, data);
    }
}
