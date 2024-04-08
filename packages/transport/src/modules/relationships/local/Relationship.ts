import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { CoreAddress, CoreDate, CoreId, CoreSynchronizable, ICoreId, ICoreSynchronizable, TransportError } from "../../../core";
import { Identity, IIdentity } from "../../accounts/data/Identity";
import { IRelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";
import { BackboneGetRelationshipsResponse } from "../backbone/BackboneGetRelationships";
import { AuditLogEntryReason } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";
import { CachedRelationship, ICachedRelationship } from "./CachedRelationship";

export interface IRelationship extends ICoreSynchronizable {
    relationshipSecretId: ICoreId;
    peer: IIdentity;
    status: RelationshipStatus;

    cache?: ICachedRelationship;
    cachedAt?: CoreDate;

    metadata?: any;
    metadataModifiedAt?: CoreDate;
}

export interface IAuditLogEntry {
    createdAt: CoreDate;
    createdBy: CoreAddress;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface IAuditLog extends Array<IAuditLogEntry> {}

export interface IEntireRelationship extends IRelationship {
    auditLog: IAuditLog;
}

@type("Relationship")
export class Relationship extends CoreSynchronizable implements IRelationship {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Relationship>((r) => r.relationshipSecretId),
        nameof<Relationship>((r) => r.peer),
        nameof<Relationship>((r) => r.status)
    ];

    public override readonly metadataProperties = [nameof<Relationship>((r) => r.metadata), nameof<Relationship>((r) => r.metadataModifiedAt)];

    @validate()
    @serialize()
    public relationshipSecretId: CoreId;

    @validate()
    @serialize()
    public peer: Identity;

    @validate()
    @serialize()
    public status: RelationshipStatus;

    @validate({ nullable: true })
    @serialize()
    public cache?: CachedRelationship;

    @validate({ nullable: true })
    @serialize()
    public cachedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): Object {
        const json = super.toJSON(verbose, serializeAsString) as any;

        // Adds flattened peerAddress and templateId to the JSON stored in the database.
        // This helps us to boost the performance of database queries that include these fields.
        json.peerAddress = this.peer.address.toString();
        json.templateId = this.cache?.template.id.toString();

        return json;
    }

    public static fromRequestSent(id: CoreId, template: IRelationshipTemplate, peer: IIdentity, creationContent: any, relationshipSecretId: CoreId): Relationship {
        const cache = CachedRelationship.from({
            creationContent,
            template: template
        });

        return Relationship.from({
            id: id,
            peer: peer,
            status: RelationshipStatus.Pending,
            cache: cache,
            cachedAt: CoreDate.utc(),
            relationshipSecretId: relationshipSecretId
        });
    }

    public static fromCreationContentReceived(
        response: BackboneGetRelationshipsResponse,
        template: IRelationshipTemplate,
        peer: IIdentity,
        creationContent: any,
        relationshipSecretId: CoreId
    ): Relationship {
        const cache = CachedRelationship.from({
            creationContent,
            template: template
        });
        return Relationship.from({
            id: CoreId.from(response.id),
            relationshipSecretId: relationshipSecretId,
            peer: peer,
            status: RelationshipStatus.Pending,
            cache: cache,
            cachedAt: CoreDate.utc()
        });
    }

    public toActive(): void {
        if (!this.cache) throw this.newCacheEmptyError();

        this.status = RelationshipStatus.Active;
    }

    public toRejected(): void {
        if (!this.cache) throw this.newCacheEmptyError();

        this.status = RelationshipStatus.Rejected;
    }

    public toRevoked(): void {
        if (!this.cache) throw this.newCacheEmptyError();

        this.status = RelationshipStatus.Revoked;
    }

    public static from(value: IRelationship): Relationship {
        return this.fromAny(value);
    }

    public setCache(cache: CachedRelationship): this {
        this.cache = cache;
        this.cachedAt = CoreDate.utc();
        return this;
    }

    public setMetadata(metadata: any): this {
        this.metadata = metadata;
        this.metadataModifiedAt = CoreDate.utc();
        return this;
    }

    private newCacheEmptyError(): Error {
        return new TransportError(`The cache of the Relationship with id "${this.id}" is empty.`);
    }
}
