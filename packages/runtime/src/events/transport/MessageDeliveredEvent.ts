import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent";

// This event is currently not triggered because it is disabled in the Backbone. (JSSNMSHDD-2372)
export class MessageDeliveredEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "transport.messageDelivered";

    public constructor(eventTargetAddress: string, data: MessageDTO) {
        super(MessageDeliveredEvent.namespace, eventTargetAddress, data);
    }
}
