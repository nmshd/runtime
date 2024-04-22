import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreDate } from "../../../core";
import { CoreSerializable, ICoreSerializable } from "../../../core/CoreSerializable";
import { CoreAddress } from "../../../core/types/CoreAddress";
import { IdentityDeletionProcess, IIdentityDeletionProcess } from "./IdentityDeletionProcess";

export interface IIdentity extends ICoreSerializable {
    address: CoreAddress;
    publicKey: ICryptoSignaturePublicKey;
    realm: Realm;
    status: IdentityStatus;
    deletionGracePeriodEndsAt?: CoreDate;
    deletionProcesses: IIdentityDeletionProcess[];
}

export enum Realm {
    Dev = "dev",
    Stage = "id0",
    Prod = "id1"
}

export enum IdentityStatus {
    Active,
    ToBeDeleted,
    Deleting
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

    @validate()
    @serialize()
    public status: IdentityStatus;

    @validate({ nullable: true })
    @serialize({ type: CoreDate })
    public deletionGracePeriodEndsAt?: CoreDate;

    @validate()
    @serialize()
    public deletionProcesses: IdentityDeletionProcess[];

    public static from(value: IIdentity): Identity {
        return this.fromAny(value);
    }
}
