import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core/index.js";

export enum DeviceType {
    "Unknown",
    "Phone",
    "Tablet",
    "Desktop",
    "Connector"
}

export interface DeviceInfo {
    operatingSystem: string;
    type: DeviceType;
}

export interface IDevice extends ICoreSynchronizable {
    isAdmin?: boolean;
    publicKey?: ICryptoSignaturePublicKey;
    name?: string;
    description?: string;
    createdAt: CoreDate;
    createdByDevice: CoreId;
    operatingSystem?: string;
    lastLoginAt?: CoreDate;
    type: DeviceType;
    username: string;
    initialPassword?: string;
    datawalletVersion?: number;
    isOffboarded?: boolean;
    isBackupDevice: boolean;
}

@type("Device")
export class Device extends CoreSynchronizable implements IDevice {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Device>((d) => d.isAdmin),
        nameof<Device>((d) => d.publicKey),
        nameof<Device>((d) => d.operatingSystem),
        nameof<Device>((d) => d.type),
        nameof<Device>((d) => d.createdAt),
        nameof<Device>((d) => d.createdByDevice),
        nameof<Device>((d) => d.lastLoginAt),
        nameof<Device>((d) => d.username),
        nameof<Device>((d) => d.initialPassword),
        nameof<Device>((d) => d.datawalletVersion),
        nameof<Device>((d) => d.isOffboarded),
        nameof<Device>((d) => d.isBackupDevice)
    ];

    public override readonly userdataProperties = [nameof<Device>((d) => d.name), nameof<Device>((d) => d.description)];

    @validate({ nullable: true })
    @serialize()
    public publicKey?: CryptoSignaturePublicKey;

    @validate({ nullable: true })
    @serialize()
    public name?: string;

    @validate({ nullable: true })
    @serialize()
    public description?: string;

    @validate({ nullable: true })
    @serialize()
    public operatingSystem?: string;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate({ nullable: true })
    @serialize()
    public lastLoginAt?: CoreDate;

    @validate({
        customValidator: (v) => (!Object.values(DeviceType).includes(v) ? `must be one of: ${Object.values(DeviceType)}` : undefined)
    })
    @serialize()
    public type: DeviceType;

    @validate({ nullable: true })
    @serialize()
    public username: string;

    @validate({ nullable: true })
    @serialize()
    public initialPassword?: string;

    @validate({ nullable: true })
    @serialize()
    public isAdmin?: boolean;

    @validate({ nullable: true })
    @serialize()
    public datawalletVersion?: number;

    @validate({ nullable: true })
    @serialize()
    public isOffboarded?: boolean;

    @validate()
    @serialize()
    public isBackupDevice: boolean;

    protected static override preFrom(value: any): any {
        if (value.isBackupDevice === undefined) value.isBackupDevice = false;

        return value;
    }

    public static from(value: IDevice): Device {
        return this.fromAny(value);
    }
}
