import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignature, ICryptoSignature } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export interface IRelationshipTemplateSigned extends ICoreSerializable {
    serializedTemplate: string;
    deviceSignature: ICryptoSignature;
}

@type("RelationshipTemplateSigned")
export class RelationshipTemplateSigned extends CoreSerializable implements IRelationshipTemplateSigned {
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
