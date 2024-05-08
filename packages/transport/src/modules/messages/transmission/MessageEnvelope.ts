import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoCipher, ICryptoCipher } from "@nmshd/crypto";
import { CoreAddress, CoreDate, CoreId, CoreSerializable, ICoreAddress, ICoreDate, ICoreId, ICoreSerializable } from "../../../core";
import { IMessageEnvelopeRecipient, MessageEnvelopeRecipient } from "./MessageEnvelopeRecipient";

export interface IMessageEnvelope extends ICoreSerializable {
    id: ICoreId;

    createdAt: ICoreDate;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;

    cipher: ICryptoCipher;

    attachments: ICoreId[];
    recipients: IMessageEnvelopeRecipient[];
}

@type("MessageEnvelope")
export class MessageEnvelope extends CoreSerializable implements IMessageEnvelope {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize({ type: MessageEnvelopeRecipient })
    public recipients: MessageEnvelopeRecipient[];

    @validate()
    @serialize()
    public cipher: CryptoCipher;

    @validate()
    @serialize({ type: CoreId })
    public attachments: CoreId[];

    public static from(value: IMessageEnvelope): MessageEnvelope {
        return this.fromAny(value);
    }

    public static mapToJSON(value: Map<CoreAddress, CryptoCipher>): Object {
        const obj: any = {};
        for (const [key, cipher] of value.entries()) {
            const serializedKey = key.serialize();
            const serializedValue = cipher.serialize();
            obj[serializedKey] = serializedValue;
        }
        return obj;
    }

    public static deserializeMap(value: any): Map<CoreAddress, CryptoCipher> {
        const obj: Map<CoreAddress, CryptoCipher> = new Map<CoreAddress, CryptoCipher>();
        for (const key in value) {
            const cipher: any = value[key];
            const serializedKey = CoreAddress.deserialize(key);
            const serializedValue = CryptoCipher.deserialize(cipher);
            obj.set(serializedKey, serializedValue);
        }
        return obj;
    }
}
