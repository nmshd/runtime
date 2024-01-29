import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { IMessageSignature, MessageSignature } from "./MessageSignature";

export interface IMessageSigned extends ICoreSerializable {
    signatures: IMessageSignature[];
    message: string;
}

/**
 * MessageSigned encapsulates the actual message with the senders digital signature.
 */
@type("MessageSigned")
export class MessageSigned extends CoreSerializable {
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
