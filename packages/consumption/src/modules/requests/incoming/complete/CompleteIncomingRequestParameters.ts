import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IMessage, IRelationship, Message, Relationship } from "@nmshd/transport";

export interface ICompleteIncomingRequestParameters extends ISerializable {
    requestId: ICoreId;
    responseSourceObject?: IMessage | IRelationship;
}

export class CompleteIncomingRequestParameters extends Serializable implements ICompleteIncomingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize({ unionTypes: [Message, Relationship] })
    @validate({ nullable: true })
    public responseSourceObject?: Message | Relationship;

    public static from(value: ICompleteIncomingRequestParameters): CompleteIncomingRequestParameters {
        return this.fromAny(value);
    }
}
