import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationRequestSigned extends ICoreSerializable {
    serializedRequest: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationRequestSigned")
export class RelationshipCreationRequestSigned extends CoreSerializable implements IRelationshipCreationRequestSigned {
    @validate()
    @serialize()
    public serializedRequest: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationRequestSigned): RelationshipCreationRequestSigned {
        return this.fromAny(value);
    }
}
