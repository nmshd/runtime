import { ISerializable, Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, ICoreBuffer, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreIdHelper } from "./CoreIdHelper";
import { TransportCoreErrors } from "./TransportCoreErrors";

export interface IReference extends ISerializable {
    id: ICoreId;
    backboneBaseUrl?: string;
    key: ICryptoSecretKey;
    forIdentityTruncated?: string;
    passwordType?: string;
    salt?: ICoreBuffer;
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

    @validate({ nullable: true, regExp: /^(pw|pin(4|5|6|7|8|9|10|11|12|13|14|15|16))$/ })
    @serialize()
    public passwordType?: string;

    @validate({ nullable: true, customValidator: (v: ICoreBuffer) => (v.buffer.byteLength === 16 ? undefined : "must be 16 bytes long") })
    @serialize()
    public salt?: CoreBuffer;

    public truncate(): string {
        const idPart = this.backboneBaseUrl ? `${this.id.toString()}@${this.backboneBaseUrl}` : this.id.toString();
        const truncatedReference = CoreBuffer.fromUtf8(
            `${idPart}|${this.key.algorithm}|${this.key.secretKey.toBase64URL()}|${this.forIdentityTruncated ? this.forIdentityTruncated : ""}|${this.salt ? this.salt.toBase64() : ""}|${this.passwordType ? this.passwordType : ""}`
        );
        return truncatedReference.toBase64URL();
    }

    public static fromTruncated(value: string): Reference {
        const truncatedBuffer = CoreBuffer.fromBase64URL(value);
        const splitted = truncatedBuffer.toUtf8().split("|");

        if (![3, 5, 6].includes(splitted.length)) {
            throw TransportCoreErrors.general.invalidTruncatedReference("A TruncatedReference must consist of either exactly 3 or exactly 5 or exactly 6 components.");
        }

        const idPart = splitted[0];
        const [id, backboneBaseUrl] = idPart.split("@");

        const secretKey = this.parseSecretKey(splitted[1], splitted[2]);
        const forIdentityTruncated = splitted[3] ? splitted[3] : undefined;
        const salt = splitted[4] ? this.parseSalt(splitted[4]) : undefined;
        const passwordType = splitted[5] ? splitted[5] : undefined;

        return this.from({
            id: CoreId.from(id),
            backboneBaseUrl,
            key: secretKey,
            forIdentityTruncated,
            passwordType,
            salt
        });
    }

    private static parseSalt(value: string): CoreBuffer | undefined {
        try {
            if (value === "") return;

            return CoreBuffer.fromBase64(value);
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
        const reference = typeof value === "string" ? this.fromTruncated(value) : this.fromAny(value);
        if (!reference.passwordType !== !reference.salt) {
            throw TransportCoreErrors.general.invalidTruncatedReference("It's not possible to have only one of passwordType and salt set.");
        }
        return reference;
    }
}
