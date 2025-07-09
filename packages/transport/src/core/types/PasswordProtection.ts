import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { SharedPasswordProtection } from "@nmshd/core-types";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { PasswordProtectionCreationParameters } from "./PasswordProtectionCreationParameters";

export interface IPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
    password: string;
    passwordLocationIndicator?: number;
}

export class PasswordProtection extends Serializable implements IPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    @validate({ min: 1 })
    @serialize()
    public password: string;

    @validate({ nullable: true, min: 0, max: 99, customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined) })
    @serialize({ any: true })
    public passwordLocationIndicator?: number;

    public static from(value: IPasswordProtection): PasswordProtection {
        return this.fromAny(value);
    }

    public toSharedPasswordProtection(): SharedPasswordProtection {
        return SharedPasswordProtection.from({
            passwordType: this.passwordType,
            salt: this.salt,
            passwordLocationIndicator: this.passwordLocationIndicator
        });
    }

    public matchesPasswordProtectionParameters(parameters: PasswordProtectionCreationParameters | undefined): boolean {
        if (!parameters) return false;

        return this.passwordType === parameters.passwordType && this.password === parameters.password && this.passwordLocationIndicator === parameters.passwordLocationIndicator;
    }
}
