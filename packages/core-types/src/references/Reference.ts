import { ISerializable, Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { CoreError } from "../CoreError";
import { CoreId, ICoreId } from "../CoreId";
import { CoreIdHelper } from "../CoreIdHelper";
import { ISharedPasswordProtection, SharedPasswordProtection } from "../SharedPasswordProtection";

export interface IReference extends ISerializable {
    id: ICoreId;
    backboneBaseUrl?: string;
    key: ICryptoSecretKey;
    forIdentityTruncated?: string;
    passwordProtection?: ISharedPasswordProtection;
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
    public passwordProtection?: SharedPasswordProtection;

    public truncate(): string {
        const idPart = this.backboneBaseUrl ? `${this.id.toString()}@${this.backboneBaseUrl}` : this.id.toString();

        const truncatedReference = CoreBuffer.fromUtf8(
            `${idPart}|${this.key.algorithm}|${this.key.secretKey.toBase64URL()}|${this.forIdentityTruncated ?? ""}|${this.passwordProtection?.truncate() ?? ""}`
        );
        return truncatedReference.toBase64URL();
    }

    public toUrl(appId?: string): string {
        if (!this.backboneBaseUrl) throw new CoreError("error.core-types.missingBackboneBaseUrl", "The backboneBaseUrl is required to create a URL from a reference.");

        const truncatedPart = CoreBuffer.fromUtf8(
            `${this.key.algorithm}|${this.key.secretKey.toBase64URL()}|${this.forIdentityTruncated ?? ""}|${this.passwordProtection?.truncate() ?? ""}`
        ).toBase64URL();

        const appIdPart = appId ? `?app=${appId}` : "";

        const link = `${this.backboneBaseUrl}/r/${this.id.toString()}${appIdPart}#${truncatedPart}`;

        return link;
    }

    public static fromTruncated(value: string): Reference {
        const truncatedBuffer = CoreBuffer.fromBase64URL(value);
        const splitted = truncatedBuffer.toUtf8().split("|");

        if (![3, 5].includes(splitted.length)) {
            throw new CoreError(
                "error.core-types.invalidTruncatedReference",
                `A truncated reference must consist of either exactly 3 or exactly 5 components, but it consists of '${splitted.length}' components.`
            );
        }

        const idPart = splitted[0];
        const [id, backboneBaseUrl] = idPart.split("@");

        const secretKey = this.parseSecretKey(splitted[1], splitted[2]);
        const forIdentityTruncated = splitted[3] ? splitted[3] : undefined;

        const passwordProtection = SharedPasswordProtection.fromTruncated(splitted[4]);

        return this.from({
            id: CoreId.from(id),
            backboneBaseUrl,
            key: secretKey,
            forIdentityTruncated,
            passwordProtection
        });
    }

    public static fromUrl(value: string): Reference {
        const url = new URL(value);

        const pathMatch = url.pathname.match(/^(?<baseUrlPath>.*)\/r\/(?<referenceId>[^/]+)$/)?.groups;

        const baseUrlPath = pathMatch?.baseUrlPath ?? "";
        const backboneBaseUrl = `${url.origin}${baseUrlPath}`;
        const id = CoreId.from(pathMatch?.referenceId ?? "");

        const hashValue = url.hash.substring(1);
        const truncatedPart = CoreBuffer.fromBase64URL(hashValue).toUtf8();
        const truncatedPartMatch = truncatedPart.match(/(?<algorithm>[^|]+)\|(?<key>[^|]+)\|(?<forIdentity>[^|]+)?\|(?<passwordProtection>[^|]+)?/)?.groups;

        const algorithm = truncatedPartMatch?.algorithm ?? "";
        const key = truncatedPartMatch?.key ?? "";
        const secretKey = this.parseSecretKey(algorithm, key);

        const forIdentityTruncated = truncatedPartMatch?.forIdentity ?? undefined;

        const passwordProtection = SharedPasswordProtection.fromTruncated(truncatedPartMatch?.passwordProtection);

        return this.from({
            id,
            backboneBaseUrl,
            key: secretKey,
            forIdentityTruncated,
            passwordProtection
        });
    }

    private static parseSecretKey(alg: string, secretKey: string): CryptoSecretKey {
        let algorithm: number;

        try {
            algorithm = parseInt(alg);
        } catch (_) {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The encryption algorithm must be indicated by an integer in the TruncatedReference.");
        }

        if (Number.isNaN(algorithm) || typeof algorithm === "undefined") {
            throw new CoreError("error.core-types.invalidTruncatedReference", "The encryption algorithm must be indicated by an integer in the TruncatedReference.");
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
        if (typeof value !== "string") return this.fromAny(value);

        if (value.startsWith("http")) return this.fromUrl(value);

        if (value.startsWith("nmshd://qr#") || value.startsWith("nmshd://tr#")) {
            return this.fromTruncated(value.substring(11));
        }

        if (value.startsWith("nmshd://")) {
            return this.fromUrl(value.replace("nmshd://", "http://"));
        }

        if (value.startsWith("nmshds://")) {
            return this.fromUrl(value.replace("nmshds://", "https://"));
        }

        return this.fromTruncated(value);
    }
}
