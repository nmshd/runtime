import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../../core";

export interface IRelationshipCreationResponseContentSigned extends ICoreSerializable {
    serializedCreationResponse: string;
    deviceSignature: ICryptoSignature;
    relationshipSignature: ICryptoSignature;
}

@type("RelationshipCreationResponseContentSigned")
export class RelationshipCreationResponseContentSigned extends CoreSerializable implements IRelationshipCreationResponseContentSigned {
    @validate()
    @serialize()
    public serializedCreationResponse: string;

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
