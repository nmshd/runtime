import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";

export interface IPasswordInfoMinusPassword extends ISerializable {
    passwordType: string;
    salt: ICoreBuffer;
}

export class PasswordInfoMinusPassword extends Serializable implements IPasswordInfoMinusPassword {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    public static from(value: IPasswordInfoMinusPassword): PasswordInfoMinusPassword {
        return this.fromAny(value);
    }
}

export interface IPasswordInfo extends IPasswordInfoMinusPassword {
    password: string;
}

export class PasswordInfo extends PasswordInfoMinusPassword implements IPasswordInfo {
    @validate({ disallowedValues: [""] })
    @serialize()
    public password: string;

    public static override from(value: IPasswordInfo): PasswordInfo {
        return this.fromAny(value);
    }
}

export interface PasswordInfoMinusSaltJSON {
    passwordType: string;
    password: string;
}

export interface IPasswordInfoMinusSalt extends ISerializable {
    passwordType: string;
    password: string;
}

export class PasswordInfoMinusSalt extends Serializable implements IPasswordInfoMinusSalt {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ disallowedValues: [""] })
    @serialize()
    public password: string;

    public static from(value: IPasswordInfoMinusSalt): PasswordInfoMinusSalt {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean, serializeAsString?: boolean): PasswordInfoMinusSaltJSON {
        return super.toJSON(verbose, serializeAsString) as PasswordInfoMinusSaltJSON;
    }
}
