import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationChangeResponseSigned extends ICoreSerializable {
    serializedResponse: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationChangeResponseSigned")
export class RelationshipCreationChangeResponseSigned extends CoreSerializable implements IRelationshipCreationChangeResponseSigned {
    @validate()
    @serialize()
    public serializedResponse: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationChangeResponseSigned): RelationshipCreationChangeResponseSigned {
        return this.fromAny(value);
    }
}
