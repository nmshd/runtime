import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { DeviceSharedSecret } from "../../devices/transmission/DeviceSharedSecret";

export interface ITokenContentDeviceSharedSecret extends ICoreSerializable {
    sharedSecret: DeviceSharedSecret;
}

@type("TokenContentDeviceSharedSecret")
export class TokenContentDeviceSharedSecret extends CoreSerializable implements ITokenContentDeviceSharedSecret {
    @validate()
    @serialize()
    public sharedSecret: DeviceSharedSecret;

    public static from(value: ITokenContentDeviceSharedSecret): TokenContentDeviceSharedSecret {
        return this.fromAny(value);
    }
}
