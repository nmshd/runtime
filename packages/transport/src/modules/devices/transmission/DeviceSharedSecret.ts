import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, CryptoSignaturePrivateKey, ICryptoSecretKey, ICryptoSignaturePrivateKey } from "@nmshd/crypto";
import { Identity, IIdentity } from "../../accounts/data/Identity";

export interface IDeviceSharedSecret extends ISerializable {
    id: ICoreId;
    createdAt: CoreDate;
    createdByDevice: CoreId;
    name?: string;
    description?: string;
    profileName?: string;
    secretBaseKey: CryptoSecretKey;
    deviceIndex: number;
    synchronizationKey: ICryptoSecretKey;
    identityPrivateKey?: ICryptoSignaturePrivateKey;
    identity: IIdentity;
    password: string;
    username: string;
    isBackupDevice: boolean;
}

@type("DeviceSharedSecret")
export class DeviceSharedSecret extends Serializable implements IDeviceSharedSecret {
    @serialize()
    @validate()
    public id: CoreId;

    @serialize()
    @validate()
    public createdByDevice: CoreId;

    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public name?: string;

    @serialize()
    @validate({ nullable: true })
    public description?: string;

    @serialize()
    @validate({ nullable: true })
    public profileName?: string;

    @serialize()
    @validate()
    public synchronizationKey: CryptoSecretKey;

    @serialize()
    @validate()
    public secretBaseKey: CryptoSecretKey;

    @serialize()
    @validate()
    public deviceIndex: number;

    @serialize()
    @validate({ nullable: true })
    public identityPrivateKey?: CryptoSignaturePrivateKey;

    @serialize()
    @validate()
    public identity: Identity;

    @serialize()
    @validate()
    public username: string;

    @serialize()
    @validate()
    public password: string;

    @serialize()
    @validate()
    public isBackupDevice: boolean;

    public static override preFrom(value: any): any {
        if (!("isBackupDevice" in value)) value.isBackupDevice = false;
        return value;
    }

    public static from(value: IDeviceSharedSecret): DeviceSharedSecret {
        return this.fromAny(value);
    }
}
