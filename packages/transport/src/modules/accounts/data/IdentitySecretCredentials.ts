import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSecretKey, CryptoSignaturePrivateKey, CryptoSignaturePublicKey, ICryptoSecretKey, ICryptoSignaturePrivateKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { Realm } from "./Realm";

export interface IIdentitySecretCredentials extends ICoreSerializable {
    publicKey?: ICryptoSignaturePublicKey;
    realm: Realm;
    synchronizationKey: ICryptoSecretKey;
    privateKey?: ICryptoSignaturePrivateKey;
}

@type("IdentitySecretCredentials")
export class IdentitySecretCredentials extends CoreSerializable implements IIdentitySecretCredentials {
    @validate()
    @serialize()
    public realm: Realm;

    @validate({ nullable: true })
    @serialize()
    public publicKey?: CryptoSignaturePublicKey;

    @validate()
    @serialize()
    public synchronizationKey: CryptoSecretKey;

    @validate({ nullable: true })
    @serialize()
    public privateKey?: CryptoSignaturePrivateKey;

    public static from(value: IIdentitySecretCredentials): IdentitySecretCredentials {
        return this.fromAny(value);
    }
}
