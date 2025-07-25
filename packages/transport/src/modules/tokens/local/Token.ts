import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IPasswordProtection, PasswordProtection } from "../../../core/types/PasswordProtection";
import { TokenReference } from "../transmission/TokenReference";

export interface IToken extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    passwordProtection?: IPasswordProtection;

    createdBy: ICoreAddress;
    createdAt: ICoreDate;
    expiresAt: ICoreDate;
    content: ISerializable;
    createdByDevice: ICoreId;
    forIdentity?: ICoreAddress;

    metadata?: any;
    metadataModifiedAt?: ICoreDate;
}

@type("Token")
export class Token extends CoreSynchronizable implements IToken {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Token>((r) => r.secretKey),
        nameof<Token>((r) => r.isOwn),
        nameof<Token>((r) => r.createdBy),
        nameof<Token>((r) => r.createdAt),
        nameof<Token>((r) => r.expiresAt),
        nameof<Token>((r) => r.createdByDevice),
        nameof<Token>((r) => r.forIdentity)
    ];
    public override readonly contentProperties = [nameof<Token>((r) => r.content)];
    public override readonly userdataProperties = [nameof<Token>((r) => r.passwordProtection)];
    public override readonly metadataProperties = [nameof<Token>((r) => r.metadata), nameof<Token>((r) => r.metadataModifiedAt)];

    @validate()
    @serialize()
    public secretKey: CryptoSecretKey;

    @validate()
    @serialize()
    public isOwn: boolean;

    @validate({ nullable: true })
    @serialize()
    public passwordProtection?: PasswordProtection;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate({ nullable: true })
    @serialize()
    public forIdentity?: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static from(value: IToken): Token {
        return this.fromAny(value);
    }

    public toTokenReference(backboneBaseUrl: string): TokenReference {
        return TokenReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey,
            forIdentityTruncated: this.forIdentity?.toString().slice(-4),
            passwordProtection: this.passwordProtection?.toSharedPasswordProtection()
        });
    }

    public setMetadata(metadata: any): void {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
    }
}
