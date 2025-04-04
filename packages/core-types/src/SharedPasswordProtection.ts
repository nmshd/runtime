import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { CoreError } from "./CoreError";

type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
type IntRange<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

enum PasswordLocationIndicatorMedium {
    RecoveryKit,
    Self,
    Letter,
    RegistrationLetter,
    Mail,
    Sms,
    App,
    Website
}

export type PasswordLocationIndicator = PasswordLocationIndicatorMedium | IntRange<50, 100>;

// TODO: should we validate that only numbers below 50 are used that have a representation in the enum?
export function validatePasswordLocationIndicator(value: number): string | undefined {
    if (value < 0 || value > 99) {
        return "must be a number between 0 and 99";
    }

    return undefined;
}

export interface ISharedPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
    passwordLocationIndicator?: PasswordLocationIndicator;
}

export class SharedPasswordProtection extends Serializable implements ISharedPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    @validate({ nullable: true, customValidator: validatePasswordLocationIndicator })
    @serialize()
    public passwordLocationIndicator?: PasswordLocationIndicator;

    public static from(value: ISharedPasswordProtection): SharedPasswordProtection {
        return this.fromAny(value);
    }

    public static fromTruncated(value?: string): SharedPasswordProtection | undefined {
        if (value === undefined || value === "") return undefined;

        const splittedPasswordParts = value.split("&");
        if (splittedPasswordParts.length !== 2 && splittedPasswordParts.length !== 3) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The password part of a TruncatedReference must consist of exactly 2 or 3 components.");
        }

        const passwordType = splittedPasswordParts[0] as "pw" | `pin${number}`;
        // TODO: we must ensure that no numbers below 50 that don't have a representation in the enum are converted
        const passwordLocationIndicator = splittedPasswordParts.length === 3 ? (Number(splittedPasswordParts[2]) as PasswordLocationIndicator) : undefined;
        try {
            const salt = CoreBuffer.fromBase64(splittedPasswordParts[1]);
            return SharedPasswordProtection.from({ passwordType, salt, passwordLocationIndicator });
        } catch (_) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The salt needs to be a Base64 value.");
        }
    }

    public truncate(): string {
        // TODO: is it necessary to explicitly convert to number?
        const passwordLocationIndicatorPart = this.passwordLocationIndicator ? `&${Number(this.passwordLocationIndicator)}` : "";
        return `${this.passwordType}&${this.salt.toBase64()}${passwordLocationIndicatorPart}`;
    }
}
