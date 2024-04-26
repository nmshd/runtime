import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreSerializable, ICoreSerializable } from "../../../core";
import { Realm } from "./Realm";

export interface IIdentity extends ICoreSerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
    realm: Realm;
}

// TODO: remove
export enum IdentityStatus {
    Active = "Active",
    ToBeDeleted = "ToBeDeleted",
    Deleting = "Deleting"
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
