import { ISerialized, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoExchangePublicKey, ICryptoExchangePublicKey, ICryptoExchangePublicKeySerialized } from "@nmshd/crypto";
import { CoreId, ICoreId } from "../../../core";

export interface IRelationshipTemplatePublicKey extends ICryptoExchangePublicKey {
    id: ICoreId;
}
export interface IRelationshipTemplatePublicKeySerialized extends ICryptoExchangePublicKeySerialized, ISerialized {
    id: string;
}

@type("RelationshipTemplatePublicKey")
export class RelationshipTemplatePublicKey extends CryptoExchangePublicKey implements IRelationshipTemplatePublicKey {
    @serialize()
    @validate()
    public id: CoreId;

    public override toJSON(verbose = true): IRelationshipTemplatePublicKeySerialized {
        return {
            id: this.id.toString(),
            pub: this.publicKey.toBase64URL(),
            alg: this.algorithm,
            "@type": verbose ? "RelationshipTemplatePublicKey" : undefined
        };
    }

    public override toBase64(): string {
        return CoreBuffer.utf8_base64(this.serialize());
    }

    public override serialize(verbose = true): string {
        return JSON.stringify(this.toJSON(verbose));
    }

    protected static override preFrom(value: any): any {
        const newValue = super.preFrom(value);
        newValue.id = value.id;

        return newValue;
    }

    public static override fromJSON(value: IRelationshipTemplatePublicKeySerialized): RelationshipTemplatePublicKey {
        return this.fromAny(value);
    }

    public static override from(value: IRelationshipTemplatePublicKey): RelationshipTemplatePublicKey {
        return this.fromAny(value);
    }
}
