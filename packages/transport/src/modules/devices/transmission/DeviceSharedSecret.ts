import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSecretKey, CryptoSignaturePrivateKey, ICryptoSecretKey, ICryptoSignaturePrivateKey } from "@nmshd/crypto";
import { CoreDate, CoreId, CoreSerializable, ICoreId } from "../../../core";
import { IIdentity, Identity } from "../../accounts/data/Identity";

export interface IDeviceSharedSecret {
    id: ICoreId;
    createdAt: CoreDate;
    createdByDevice: CoreId;
    name?: string;
    description?: string;
    secretBaseKey: CryptoSecretKey;
    deviceIndex: number;
    synchronizationKey: ICryptoSecretKey;
    identityPrivateKey?: ICryptoSignaturePrivateKey;
    identity: IIdentity;
    password: string;
    username: string;
}

@type("DeviceSharedSecret")
export class DeviceSharedSecret extends CoreSerializable implements IDeviceSharedSecret {
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

    public static from(value: IDeviceSharedSecret): DeviceSharedSecret {
        return this.fromAny(value);
    }
}
