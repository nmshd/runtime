import { MessageDTO } from "@nmshd/runtime-types";
import { DataEvent } from "../DataEvent.js";

export class MessageProcessedEvent extends DataEvent<MessageProcessedEventData> {
    public static readonly namespace = "consumption.messageProcessed";

    public constructor(eventTargetAddress: string, message: MessageDTO, result: MessageProcessedResult) {
        super(MessageProcessedEvent.namespace, eventTargetAddress, { message, result });
    }
}

export enum MessageProcessedResult {
    RequestAutomaticallyDecided = "RequestAutomaticallyDecided",
    ManualRequestDecisionRequired = "ManualRequestDecisionRequired",
    NoRequest = "NoRequest",
    Error = "Error"
}

export interface MessageProcessedEventData {
    message: MessageDTO;
    result: MessageProcessedResult;
}
