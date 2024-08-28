import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSecretKey, CryptoSignaturePrivateKey, CryptoSignaturePublicKey, ICryptoSecretKey, ICryptoSignaturePrivateKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";

export interface IIdentitySecretCredentials extends ISerializable {
    publicKey?: ICryptoSignaturePublicKey;
    synchronizationKey: ICryptoSecretKey;
    privateKey?: ICryptoSignaturePrivateKey;
}

@type("IdentitySecretCredentials")
export class IdentitySecretCredentials extends Serializable implements IIdentitySecretCredentials {
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
