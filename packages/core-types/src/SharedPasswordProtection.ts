import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";
import { CoreError } from "./CoreError";

export interface ISharedPasswordProtection extends ISerializable {
    passwordType: "pw" | `pin${number}`;
    salt: ICoreBuffer;
}

export class SharedPasswordProtection extends Serializable implements ISharedPasswordProtection {
    @validate({ regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType: "pw" | `pin${number}`;

    @validate({ customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt: CoreBuffer;

    public static from(value: ISharedPasswordProtection): SharedPasswordProtection {
        return this.fromAny(value);
    }

    public static fromTruncated(value?: string): SharedPasswordProtection | undefined {
        if (value === undefined || value === "") return undefined;

        const splittedPasswordParts = value.split("&");
        if (splittedPasswordParts.length !== 2) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The password part of a TruncatedReference must consist of exactly 2 components.");
        }

        const passwordType = splittedPasswordParts[0] as "pw" | `pin${number}`;
        try {
            const salt = CoreBuffer.fromBase64(splittedPasswordParts[1]);
            return SharedPasswordProtection.from({ passwordType, salt });
        } catch (_) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The salt needs to be a Base64 value.");
        }
    }

    public truncate(): string {
        return `${this.passwordType}&${this.salt.toBase64()}`;
    }
}
