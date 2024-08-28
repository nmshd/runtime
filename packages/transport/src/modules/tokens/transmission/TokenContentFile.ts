import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";

export interface ITokenContentFile extends ISerializable {
    fileId: ICoreId;
    secretKey: ICryptoSecretKey;
}

@type("TokenContentFile")
export class TokenContentFile extends Serializable implements ITokenContentFile {
    @validate()
    @serialize()
    public fileId: CoreId;

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    public static from(value: ITokenContentFile): TokenContentFile {
        return this.fromAny(value);
    }
}
