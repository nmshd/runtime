import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreSerializable, ICoreSerializable } from "../../../core";
import { IdentityDeletionProcess, IIdentityDeletionProcess } from "./IdentityDeletionProcess";
import { Realm } from "./Realm";

export interface IIdentity extends ICoreSerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
    realm: Realm;
    deletionInfo?: IIdentityDeletionProcess;
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

    @validate({ nullable: true })
    @serialize()
    public deletionInfo?: IdentityDeletionProcess;

    public static from(value: IIdentity): Identity {
        return this.fromAny(value);
    }
}
