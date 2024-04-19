import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationContentSigned extends ICoreSerializable {
    serializedCreationContent: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationContentSigned")
export class RelationshipCreationContentSigned extends CoreSerializable implements IRelationshipCreationContentSigned {
    @validate()
    @serialize()
    public serializedCreationContent: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationContentSigned): RelationshipCreationContentSigned {
        return this.fromAny(value);
    }
}
