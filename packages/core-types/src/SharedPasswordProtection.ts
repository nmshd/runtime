import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { CoreError } from "./CoreError";

export interface ISharedPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
    passwordLocationIndicator?: number;
}

export class SharedPasswordProtection extends Serializable implements ISharedPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    @validate({ nullable: true, min: 50, max: 99, customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined) })
    @serialize({ any: true })
    public passwordLocationIndicator?: number;

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
        const passwordLocationIndicator = splittedPasswordParts.length === 3 ? Number(splittedPasswordParts[2]) : undefined;

        try {
            const salt = CoreBuffer.fromBase64(splittedPasswordParts[1]);
            return SharedPasswordProtection.from({ passwordType, salt, passwordLocationIndicator });
        } catch (_) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The salt needs to be a Base64 value.");
        }
    }

    public truncate(): string {
        const passwordLocationIndicatorPart = this.passwordLocationIndicator !== undefined ? `&${this.passwordLocationIndicator}` : "";
        return `${this.passwordType}&${this.salt.toBase64()}${passwordLocationIndicatorPart}`;
    }
}
