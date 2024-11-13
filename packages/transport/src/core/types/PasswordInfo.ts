import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";

export interface IReducedPasswordInfo extends ISerializable {
    passwordType: string;
    salt: ICoreBuffer;
}

export class ReducedPasswordInfo extends Serializable implements IReducedPasswordInfo {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    public static from(value: IReducedPasswordInfo): ReducedPasswordInfo {
        return this.fromAny(value);
    }
}

export interface IPasswordInfo extends IReducedPasswordInfo {
    password: string;
}

export class PasswordInfo extends ReducedPasswordInfo implements IPasswordInfo {
    @validate({ disallowedValues: [""] })
    @serialize()
    public password: string;

    public static override from(value: IPasswordInfo): PasswordInfo {
        return this.fromAny(value);
    }
}

export interface IInitialPasswordInfo extends ISerializable {
    passwordType: string;
    password: string;
}

export class InitialPasswordInfo extends Serializable implements IInitialPasswordInfo {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ disallowedValues: [""] })
    @serialize()
    public password: string;

    public static from(value: IInitialPasswordInfo): InitialPasswordInfo {
        return this.fromAny(value);
    }
}
