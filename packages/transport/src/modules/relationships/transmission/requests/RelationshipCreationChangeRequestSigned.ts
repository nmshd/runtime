import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationChangeRequestSigned extends ICoreSerializable {
    serializedRequest: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationChangeRequestSigned")
export class RelationshipCreationChangeRequestSigned extends CoreSerializable implements IRelationshipCreationChangeRequestSigned {
    @validate()
    @serialize()
    public serializedRequest: string;

    @validate()
    @serialize()
    public deviceSignature: CryptoSignature;

    @validate()
    @serialize()
    public relationshipSignature: CryptoSignature;

    public static from(value: IRelationshipCreationChangeRequestSigned): RelationshipCreationChangeRequestSigned {
        return this.fromAny(value);
    }
}
