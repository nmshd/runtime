import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseSigned extends ICoreSerializable {
    serializedCreationResponse: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationResponseSigned")
export class RelationshipCreationResponseSigned extends CoreSerializable implements IRelationshipCreationResponseSigned {
    @validate()
    @serialize()
    public serializedCreationResponse: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationResponseSigned): RelationshipCreationResponseSigned {
        return this.fromAny(value);
    }
}
