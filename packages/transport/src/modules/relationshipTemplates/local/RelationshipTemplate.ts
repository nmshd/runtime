import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable, IPasswordProtection, PasswordProtection } from "../../../core";
import { RelationshipTemplateReference } from "../transmission/RelationshipTemplateReference";
import { CachedRelationshipTemplate, ICachedRelationshipTemplate } from "./CachedRelationshipTemplate";

export interface IRelationshipTemplate extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    passwordProtection?: IPasswordProtection;
    cache?: ICachedRelationshipTemplate;
    cachedAt?: ICoreDate;
    metadata?: any;
    metadataModifiedAt?: ICoreDate;
}

@type("RelationshipTemplate")
export class RelationshipTemplate extends CoreSynchronizable implements IRelationshipTemplate {
    public override readonly technicalProperties = ["@type", "@context", nameof<RelationshipTemplate>((r) => r.secretKey), nameof<RelationshipTemplate>((r) => r.isOwn)];
    public override readonly userdataProperties = [nameof<RelationshipTemplate>((r) => r.passwordProtection)];
    public override readonly metadataProperties = [nameof<RelationshipTemplate>((r) => r.metadata), nameof<RelationshipTemplate>((r) => r.metadataModifiedAt)];

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
    public cache?: CachedRelationshipTemplate;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static from(value: IRelationshipTemplate): RelationshipTemplate {
        return this.fromAny(value);
    }

    public toRelationshipTemplateReference(backboneBaseUrl?: string): RelationshipTemplateReference {
        return RelationshipTemplateReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey,
            forIdentityTruncated: this.cache!.forIdentity?.toString().slice(-4),
            passwordProtection: this.passwordProtection?.toSharedPasswordProtection()
        });
    }

    public truncate(backboneBaseUrl?: string): string {
        const reference = this.toRelationshipTemplateReference(backboneBaseUrl);
        return reference.truncate();
    }

    public setCache(cache: CachedRelationshipTemplate): this {
        this.cache = cache;
        this.cachedAt = CoreDate.utc();
        return this;
    }

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }

    public isExpired(comparisonDate: CoreDate = CoreDate.utc()): boolean {
        if (!this.cache?.expiresAt) return false;

        return comparisonDate.isAfter(this.cache.expiresAt);
    }
}
