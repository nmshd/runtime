import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRequest, Request } from "@nmshd/content";
import { IMessage, IRelationshipTemplate, Message, RelationshipTemplate } from "@nmshd/transport";

export interface IReceivedIncomingRequestParameters extends ISerializable {
    receivedRequest: IRequest;
    requestSourceObject: IMessage | IRelationshipTemplate;
}

@type("ReceivedIncomingRequestParameters")
export class ReceivedIncomingRequestParameters extends Serializable implements IReceivedIncomingRequestParameters {
    @serialize()
    @validate()
    public receivedRequest: Request;

    @serialize({ unionTypes: [Message, RelationshipTemplate] })
    @validate()
    public requestSourceObject: Message | RelationshipTemplate;

    public static from(value: IReceivedIncomingRequestParameters): ReceivedIncomingRequestParameters {
        return this.fromAny(value);
    }
}
