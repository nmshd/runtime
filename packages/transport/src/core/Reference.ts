import { ISerializable, Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreIdHelper } from "./CoreIdHelper";
import { TransportCoreErrors } from "./TransportCoreErrors";

export interface IReference extends ISerializable {
    id: ICoreId;
    key: ICryptoSecretKey;
}

export class Reference extends Serializable implements IReference {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public key: CryptoSecretKey;

    public truncate(): string {
        const truncatedReference = CoreBuffer.fromUtf8(`${this.id.toString()}|${this.key.algorithm}|${this.key.secretKey.toBase64URL()}`);
        return truncatedReference.toBase64URL();
    }

    public static fromTruncated(value: string): Reference {
        const truncatedBuffer = CoreBuffer.fromBase64URL(value);
        const splitted = truncatedBuffer.toUtf8().split("|");

        if (splitted.length !== 3) {
            throw TransportCoreErrors.general.invalidTruncatedReference();
        }

        try {
            const id = CoreId.from(splitted[0]);
            const alg = parseInt(splitted[1]);
            const key = splitted[2];
            const secretKey = CryptoSecretKey.from({
                algorithm: alg,
                secretKey: CoreBuffer.fromBase64URL(key)
            });

            return this.from({
                id: CoreId.from(id),
                key: secretKey
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
