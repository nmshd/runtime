import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";

export interface ISendDeviceParameters extends ISerializable {
    name?: string;
    description?: string;
    isAdmin?: boolean;
    isBackupDevice?: boolean;
}

@type("SendDeviceParameters")
export class SendDeviceParameters extends Serializable implements ISendDeviceParameters {
    @validate({ nullable: true })
    @serialize()
    public name?: string;

    @validate({ nullable: true })
    @serialize()
    public description?: string;

    @validate({ nullable: true })
    @serialize()
    public isAdmin?: boolean;

    @validate({ nullable: true })
    @serialize()
    public isBackupDevice?: boolean;

    public static from(value: ISendDeviceParameters): SendDeviceParameters {
        return this.fromAny(value);
    }
}
