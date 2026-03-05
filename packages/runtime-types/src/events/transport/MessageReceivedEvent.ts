import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "@nmshd/runtime-types/src/events/DataEvent";

export class MessageReceivedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageReceived";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageReceivedEvent.namespace, eventTargetAddress, data);
    }
}
