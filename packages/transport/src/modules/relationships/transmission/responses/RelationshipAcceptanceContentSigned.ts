import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipAcceptanceContentSigned extends ICoreSerializable {
    serializedAcceptanceContent: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipAcceptanceContentSigned")
export class RelationshipAcceptanceContentSigned extends CoreSerializable implements IRelationshipAcceptanceContentSigned {
    @validate()
    @serialize()
    public serializedAcceptanceContent: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipAcceptanceContentSigned): RelationshipAcceptanceContentSigned {
        return this.fromAny(value);
    }
}
