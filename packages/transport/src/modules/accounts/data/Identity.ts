import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreSerializable, ICoreSerializable } from "../../../core/CoreSerializable";
import { CoreAddress } from "../../../core/types/CoreAddress";

export interface IIdentity extends ICoreSerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
    realm: Realm;
}

export const enmeshedPrefix = "did:e:";

export enum Realm {
    Dev = "dev.enmeshed.eu:dids:",
    Stage = "stage.enmeshed.eu:dids:",
    Prod = "prod.enmeshed.eu:dids:"
}

@type("Identity")
export class Identity extends CoreSerializable implements IIdentity {
    @validate()
    @serialize()
    public address: CoreAddress;

    @validate()
    @serialize()
    public publicKey: CryptoSignaturePublicKey;

    @validate()
    @serialize()
    public realm: Realm;

    public static from(value: IIdentity): Identity {
        return this.fromAny(value);
    }
}
