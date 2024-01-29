import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export interface ISendDeviceParameters extends ICoreSerializable {
    name?: string;
    description?: string;
    isAdmin?: boolean;
}

@type("SendDeviceParameters")
export class SendDeviceParameters extends CoreSerializable implements ISendDeviceParameters {
    @validate({ nullable: true })
    @serialize()
    public name?: string;

    @validate({ nullable: true })
    @serialize()
    public description?: string;

    @validate({ nullable: true })
    @serialize()
    public isAdmin?: boolean;

    public static from(value: ISendDeviceParameters): SendDeviceParameters {
        return this.fromAny(value);
    }
}
