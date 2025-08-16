import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CryptoSecretKey, ICryptoExchangePublicKey, ICryptoSecretKey } from "@nmshd/crypto";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable, IPasswordProtection, PasswordProtection } from "../../../core";
import { Identity, IIdentity } from "../../accounts/data/Identity";
import { RelationshipTemplatePublicKey } from "../transmission/RelationshipTemplatePublicKey";
import { RelationshipTemplateReference } from "../transmission/RelationshipTemplateReference";

export interface IRelationshipTemplate extends ICoreSynchronizable {
    secretKey: ICryptoSecretKey;
    isOwn: boolean;
    passwordProtection?: IPasswordProtection;

    identity: IIdentity;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    templateKey: ICryptoExchangePublicKey;
    content: ISerializable;
    createdAt: ICoreDate;
    expiresAt?: ICoreDate;
    maxNumberOfAllocations?: number;
    forIdentity?: ICoreAddress;

    metadata?: any;
    metadataModifiedAt?: ICoreDate;
}

@type("RelationshipTemplate")
export class RelationshipTemplate extends CoreSynchronizable implements IRelationshipTemplate {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<RelationshipTemplate>((r) => r.secretKey),
        nameof<RelationshipTemplate>((r) => r.isOwn),
        nameof<RelationshipTemplate>((r) => r.identity),
        nameof<RelationshipTemplate>((r) => r.createdBy),
        nameof<RelationshipTemplate>((r) => r.createdByDevice),
        nameof<RelationshipTemplate>((r) => r.templateKey),
        nameof<RelationshipTemplate>((r) => r.createdAt),
        nameof<RelationshipTemplate>((r) => r.expiresAt),
        nameof<RelationshipTemplate>((r) => r.maxNumberOfAllocations),
        nameof<RelationshipTemplate>((r) => r.forIdentity)
    ];
    public override readonly contentProperties = [nameof<RelationshipTemplate>((r) => r.content)];
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

    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize()
    public templateKey: RelationshipTemplatePublicKey;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    @validate({ nullable: true, customValidator: validateMaxNumberOfAllocations })
    @serialize()
    public maxNumberOfAllocations?: number;

    @validate({ nullable: true })
    @serialize()
    public forIdentity?: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static from(value: IRelationshipTemplate): RelationshipTemplate {
        return this.fromAny(value);
    }

    public toRelationshipTemplateReference(backboneBaseUrl: string): RelationshipTemplateReference {
        return RelationshipTemplateReference.from({
            id: this.id,
            backboneBaseUrl,
            key: this.secretKey,
            forIdentityTruncated: this.forIdentity?.toString().slice(-4),
            passwordProtection: this.passwordProtection?.toSharedPasswordProtection()
        });
    }

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }

    public isExpired(comparisonDate: CoreDate = CoreDate.utc()): boolean {
        if (!this.expiresAt) return false;

        return comparisonDate.isAfter(this.expiresAt);
    }
}

export function validateMaxNumberOfAllocations(value?: number): string | undefined {
    if (value === undefined) return;

    if (value <= 0) {
        return "maxNumberOfAllocations must be greater than 0";
    }

    return;
}
