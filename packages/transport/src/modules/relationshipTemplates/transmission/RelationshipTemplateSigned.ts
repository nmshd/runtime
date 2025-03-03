import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";

export interface IRelationshipTemplateSigned extends ISerializable {
    serializedTemplate: string;
    deviceSignature: ICryptoSignature;
}

@type("RelationshipTemplateSigned")
export class RelationshipTemplateSigned extends Serializable implements IRelationshipTemplateSigned {
    @validate()
    @serialize()
    public serializedTemplate: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    public static from(value: IRelationshipTemplateSigned): RelationshipTemplateSigned {
        return this.fromAny(value);
    }
}
