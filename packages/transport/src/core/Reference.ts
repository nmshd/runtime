import { ISerializable, Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreIdHelper } from "./CoreIdHelper";
import { TransportCoreErrors } from "./TransportCoreErrors";
import { IPasswordInfoMinusPassword, PasswordInfoMinusPassword } from "./types/PasswordInfo";

export interface IReference extends ISerializable {
    id: ICoreId;
    backboneBaseUrl?: string;
    key: ICryptoSecretKey;
    forIdentityTruncated?: string;
    passwordProtection?: IPasswordInfoMinusPassword;
}

@type("Reference")
export class Reference extends Serializable implements IReference {
    @validate({ regExp: new RegExp("^[A-Za-z0-9]{20}$") })
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public backboneBaseUrl?: string;

    @validate()
    @serialize()
    public key: CryptoSecretKey;

    @validate({ nullable: true, regExp: new RegExp("^[0-9a-f]{4}$") })
    @serialize()
    public forIdentityTruncated?: string;

    @validate({ nullable: true })
    @serialize()
    public passwordProtection?: PasswordInfoMinusPassword;

    public truncate(): string {
        const idPart = this.backboneBaseUrl ? `${this.id.toString()}@${this.backboneBaseUrl}` : this.id.toString();
        const passwordPart = this.passwordProtection ? `${this.passwordProtection.passwordType}&${this.passwordProtection.salt.toBase64()}` : "";

        const truncatedReference = CoreBuffer.fromUtf8(
            `${idPart}|${this.key.algorithm}|${this.key.secretKey.toBase64URL()}|${this.forIdentityTruncated ? this.forIdentityTruncated : ""}|${passwordPart}`
        );
        return truncatedReference.toBase64URL();
    }

    public static fromTruncated(value: string): Reference {
        const truncatedBuffer = CoreBuffer.fromBase64URL(value);
        const splitted = truncatedBuffer.toUtf8().split("|");

        if (![3, 5].includes(splitted.length)) {
            throw TransportCoreErrors.general.invalidTruncatedReference("A TruncatedReference must consist of either exactly 3 or exactly 5 components.");
        }

        const idPart = splitted[0];
        const [id, backboneBaseUrl] = idPart.split("@");

        const secretKey = this.parseSecretKey(splitted[1], splitted[2]);
        const forIdentityTruncated = splitted[3] ? splitted[3] : undefined;

        const passwordProtection = this.parsePasswordPart(splitted[4]);

        return this.from({
            id: CoreId.from(id),
            backboneBaseUrl,
            key: secretKey,
            forIdentityTruncated,
            passwordProtection
        });
    }

    private static parsePasswordPart(value?: string): IPasswordInfoMinusPassword | undefined {
        if (!value) return;
        const splittedPasswordParts = value.split("&");
        if (splittedPasswordParts.length !== 2) {
            throw TransportCoreErrors.general.invalidTruncatedReference("The password part of a TruncatedReference must consist of exactly 2 components.");
        }

        const passwordType = splittedPasswordParts[0];
        try {
            const salt = CoreBuffer.fromBase64(splittedPasswordParts[1]);
            return { passwordType, salt };
        } catch (_) {
            throw TransportCoreErrors.general.invalidTruncatedReference("The salt needs to be a Base64 value.");
        }
    }

    private static parseSecretKey(alg: string, secretKey: string): CryptoSecretKey {
        let algorithm: number;

        try {
            algorithm = parseInt(alg);
        } catch (_) {
            throw TransportCoreErrors.general.invalidTruncatedReference("The encryption algorithm must be indicated by an integer in the TruncatedReference.");
        }

        if (Number.isNaN(algorithm) || typeof algorithm === "undefined") {
            throw TransportCoreErrors.general.invalidTruncatedReference("The encryption algorithm must be indicated by an integer in the TruncatedReference.");
        }

        return CryptoSecretKey.from({
            algorithm,
            secretKey: CoreBuffer.fromBase64URL(secretKey)
        });
    }

    protected static validateId(value: any, helper: CoreIdHelper): void {
        if (!value?.id) return;

        if (!helper.validate(value.id)) {
            throw new ValidationError(this.name, "id", `id must start with '${helper.prefix}' but is '${value.id}'`);
        }
    }

    public static from(value: IReference | string): Reference {
        if (typeof value === "string") return this.fromTruncated(value);

        return this.fromAny(value);
    }
}
