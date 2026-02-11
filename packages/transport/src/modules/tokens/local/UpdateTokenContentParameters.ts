import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId, ISharedPasswordProtection, SharedPasswordProtection } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface IUpdateTokenContentParameters extends ISerializable {
    id: ICoreId;
    secretKey: ICryptoSecretKey;
    content: ISerializable;
    passwordProtection?: ISharedPasswordProtection;
}

@type("UpdateTokenContentParameters")
export class UpdateTokenContentParameters extends Serializable implements IUpdateTokenContentParameters {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public content: Serializable;

    @validate({ nullable: true })
    @serialize()
    public passwordProtection?: SharedPasswordProtection;

    public static from(value: IUpdateTokenContentParameters): UpdateTokenContentParameters {
        return this.fromAny(value);
    }
}
