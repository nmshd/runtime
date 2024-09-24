import { ISerializable, Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreIdHelper } from "./CoreIdHelper";
import { TransportCoreErrors } from "./TransportCoreErrors";

export interface IReference extends ISerializable {
    id: ICoreId;
    backboneBaseUrl?: string;
    key: ICryptoSecretKey;
    forIdentityTruncated?: string;
    passwordType?: number;
}

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

    @validate({ nullable: true, min: 1, max: 12, customValidator: (v) => (!Number.isInteger(v) ? "must be an integer" : undefined) })
    @serialize()
    public passwordType?: number;

    public truncate(): string {
        const idPart = this.backboneBaseUrl ? `${this.id.toString()}@${this.backboneBaseUrl}` : this.id.toString();
        const truncatedReference = CoreBuffer.fromUtf8(
            `${idPart}|${this.key.algorithm}|${this.key.secretKey.toBase64URL()}|${this.forIdentityTruncated ? this.forIdentityTruncated : ""}|${this.passwordType ? this.passwordType.toString() : ""}`
        );
        return truncatedReference.toBase64URL();
    }

    public static fromTruncated(value: string): Reference {
        const truncatedBuffer = CoreBuffer.fromBase64URL(value);
        const splitted = truncatedBuffer.toUtf8().split("|");

        if (![3, 5].includes(splitted.length)) {
            throw TransportCoreErrors.general.invalidTruncatedReference();
        }

        try {
            const idPart = splitted[0];
            const [id, backboneBaseUrl] = idPart.split("@");
            const alg = parseInt(splitted[1]);
            const key = splitted[2];
            const forIdentityTruncated = splitted[3] ? splitted[3] : undefined;
            const passwordType = splitted[4] ? parseInt(splitted[4]) : undefined;
            const secretKey = CryptoSecretKey.from({
                algorithm: alg,
                secretKey: CoreBuffer.fromBase64URL(key)
            });

            return this.from({
                id: CoreId.from(id),
                backboneBaseUrl,
                key: secretKey,
                forIdentityTruncated,
                passwordType
            });
        } catch (e) {
            throw TransportCoreErrors.general.invalidTruncatedReference();
        }
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
