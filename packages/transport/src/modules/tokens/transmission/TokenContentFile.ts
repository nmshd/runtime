import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../core";

export interface ITokenContentFile extends ICoreSerializable {
    fileId: ICoreId;
    secretKey: ICryptoSecretKey;
}

@type("TokenContentFile")
export class TokenContentFile extends CoreSerializable implements ITokenContentFile {
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
