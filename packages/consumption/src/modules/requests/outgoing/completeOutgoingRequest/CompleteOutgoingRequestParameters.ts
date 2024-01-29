import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IResponse, Response } from "@nmshd/content";
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport";

export interface ICompleteOutgoingRequestParameters extends ISerializable {
    requestId: ICoreId;
    responseSourceObject: IMessage;
    receivedResponse: IResponse;
}

@type("CompleteOutgoingRequestParameters")
export class CompleteOutgoingRequestParameters extends Serializable implements ICompleteOutgoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize()
    @validate()
    public responseSourceObject: Message;

    @serialize()
    @validate()
    public receivedResponse: Response;

    public static from(value: ICompleteOutgoingRequestParameters): CompleteOutgoingRequestParameters {
        return this.fromAny(value);
    }
}
