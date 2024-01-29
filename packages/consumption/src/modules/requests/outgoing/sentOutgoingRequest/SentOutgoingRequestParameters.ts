import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport";

export interface ISentOutgoingRequestParameters extends ISerializable {
    requestId: ICoreId;
    requestSourceObject: IMessage;
}

@type("SentOutgoingRequestParameters")
export class SentOutgoingRequestParameters extends Serializable implements ISentOutgoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize()
    @validate()
    public requestSourceObject: Message;

    public static from(value: ISentOutgoingRequestParameters): SentOutgoingRequestParameters {
        return this.fromAny(value);
    }
}
