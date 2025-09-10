import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { CoreError } from "./CoreError";

export interface ISharedPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
    passwordLocationIndicator?: number;
    password?: string;
}

export class SharedPasswordProtection extends Serializable implements ISharedPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    @validate({ nullable: true, min: 0, max: 99, customValidator: (v) => (!Number.isInteger(v) ? "This value must be an integer." : undefined) })
    @serialize({ any: true })
    public passwordLocationIndicator?: number;

    @validate({ nullable: true })
    @serialize()
    public password?: string;

    public static from(value: ISharedPasswordProtection): SharedPasswordProtection {
        return this.fromAny(value);
    }

    public static fromTruncated(value?: string): SharedPasswordProtection | undefined {
        if (value === undefined || value === "") return undefined;

        const splittedPasswordParts = value.split("&");
        if (![2, 3, 4].includes(splittedPasswordParts.length)) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The password part of a TruncatedReference must consist of 2, 3 or 4 components.");
        }

        const passwordType = splittedPasswordParts[0] as "pw" | `pin${number}`;
        const passwordLocationIndicator = splittedPasswordParts.length > 2 && splittedPasswordParts[2] !== "" ? parseInt(splittedPasswordParts[2]) : undefined;

        const salt = this.parseSalt(splittedPasswordParts[1]);

        const password = splittedPasswordParts.length > 3 && splittedPasswordParts[3] ? splittedPasswordParts[3] : undefined;

        return SharedPasswordProtection.from({ passwordType, salt, passwordLocationIndicator, password });
    }

    private static parseSalt(value: string): CoreBuffer {
        try {
            const salt = CoreBuffer.fromBase64(value);
            return salt;
        } catch (_) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The salt needs to be a Base64 value.");
        }
    }

    public truncate(): string {
        const base = `${this.passwordType}&${this.salt.toBase64()}`;

        if (this.passwordLocationIndicator === undefined && this.password === undefined) return base;

        return `${base}&${this.passwordLocationIndicator ?? ""}${this.password ? `&${this.password}` : ""}`;
    }
}
