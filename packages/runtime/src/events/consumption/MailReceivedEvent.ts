import { Mail } from "@nmshd/content";
import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

export class MailReceivedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "consumption.mailReceived";

    public constructor(
        eventTargetAddress: string,
        public readonly mail: Mail,
        data: MessageDTO
    ) {
        super(MailReceivedEvent.namespace, eventTargetAddress, data);
    }
}
