import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface IDeviceSecretCredentials extends ISerializable {
    id: ICoreId;
    password?: string;
    username?: string;
}

@type("DeviceSecretCredentials")
export class DeviceSecretCredentials extends Serializable implements IDeviceSecretCredentials {
    @serialize()
    @validate()
    public id: CoreId;

    @serialize()
    @validate({ nullable: true })
    public password?: string;

    @serialize()
    @validate({ nullable: true })
    public username?: string;

    public static from(value: IDeviceSecretCredentials): DeviceSecretCredentials {
        return this.fromAny(value);
    }
}
