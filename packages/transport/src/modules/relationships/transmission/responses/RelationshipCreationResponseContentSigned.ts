import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";

export interface IRelationshipCreationResponseContentSigned extends ISerializable {
    serializedCreationResponseContent: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationResponseContentSigned")
export class RelationshipCreationResponseContentSigned extends Serializable implements IRelationshipCreationResponseContentSigned {
    @validate()
    @serialize()
    public serializedCreationResponseContent: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationResponseContentSigned): RelationshipCreationResponseContentSigned {
        return this.fromAny(value);
    }
}
