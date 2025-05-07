import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IPasswordProtection, PasswordProtection } from "../../../core/types/PasswordProtection";
import { TokenReference } from "../transmission/TokenReference";
import { CachedToken, ICachedToken } from "./CachedToken";

export interface IToken extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    passwordProtection?: IPasswordProtection;
    cache?: ICachedToken;
    cachedAt?: ICoreDate;
    metadata?: any;
    metadataModifiedAt?: ICoreDate;
}

@type("Token")
export class Token extends CoreSynchronizable implements IToken {
    public override readonly technicalProperties = ["@type", "@context", nameof<Token>((r) => r.secretKey), nameof<Token>((r) => r.isOwn)];
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

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedToken;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

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
            forIdentityTruncated: this.cache!.forIdentity?.toString().slice(-4),
            passwordProtection: this.passwordProtection?.toSharedPasswordProtection()
        });
    }

    public setCache(cache: CachedToken): this {
        this.cache = cache;
        this.cachedAt = CoreDate.utc();
        return this;
    }

    public setMetadata(metadata: any): void {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
    }
}
