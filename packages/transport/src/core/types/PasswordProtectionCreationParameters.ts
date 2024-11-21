import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

export interface IPasswordProtectionCreationParameters extends ISerializable {
    passwordType: string;
    password: string;
}

export class PasswordProtectionCreationParameters extends Serializable implements IPasswordProtectionCreationParameters {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: string;

    @validate({ disallowedValues: [""] })
    @serialize()
    public password: string;

    public static from(value: IPasswordProtectionCreationParameters): PasswordProtectionCreationParameters {
        return this.fromAny(value);
    }
}
