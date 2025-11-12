import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IMessageSignature, MessageSignature } from "./MessageSignature.js";

export interface IMessageSigned extends ISerializable {
    signatures: IMessageSignature[];
    message: string;
}

/**
 * MessageSigned encapsulates the actual message with the senders digital signature.
 */
@type("MessageSigned")
export class MessageSigned extends Serializable {
    @validate()
    @serialize({ type: MessageSignature })
    public signatures: MessageSignature[];

    @validate()
    @serialize()
    public message: string;

    public static from(value: IMessageSigned): MessageSigned {
        return this.fromAny(value);
    }
}
