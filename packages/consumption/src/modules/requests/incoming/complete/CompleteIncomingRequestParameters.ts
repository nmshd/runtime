import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId, IMessage, IRelationshipChange, Message, RelationshipChange } from "@nmshd/transport";

export interface ICompleteIncomingRequestParameters extends ISerializable {
    requestId: ICoreId;
    responseSourceObject?: IMessage | IRelationshipChange;
}

export class CompleteIncomingRequestParameters extends Serializable implements ICompleteIncomingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize({ unionTypes: [Message, RelationshipChange] })
    @validate({ nullable: true })
    public responseSourceObject?: Message | RelationshipChange;

    public static from(value: ICompleteIncomingRequestParameters): CompleteIncomingRequestParameters {
        return this.fromAny(value);
    }
}
