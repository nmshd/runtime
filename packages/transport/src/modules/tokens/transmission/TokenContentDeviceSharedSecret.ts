import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { DeviceSharedSecret } from "../../devices/transmission/DeviceSharedSecret.js";

export interface ITokenContentDeviceSharedSecret extends ISerializable {
    sharedSecret: DeviceSharedSecret;
}

@type("TokenContentDeviceSharedSecret")
export class TokenContentDeviceSharedSecret extends Serializable implements ITokenContentDeviceSharedSecret {
    @validate()
    @serialize()
    public sharedSecret: DeviceSharedSecret;

    public static from(value: ITokenContentDeviceSharedSecret): TokenContentDeviceSharedSecret {
        return this.fromAny(value);
    }
}
