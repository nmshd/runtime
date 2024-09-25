import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { Identity, IIdentity } from "../../accounts/data/Identity";
import { BackboneGetRelationshipResponse } from "../backbone/BackboneGetRelationships";
import { RelationshipStatus } from "../transmission/RelationshipStatus";
import { CachedRelationship, ICachedRelationship } from "./CachedRelationship";
import { IPeerDeletionInfo, PeerDeletionInfo } from "./PeerDeletionInfo";
import { RelationshipAuditLog } from "./RelationshipAuditLog";

export interface IRelationship extends ICoreSynchronizable {
    relationshipSecretId: ICoreId;
    peer: IIdentity;
    peerDeletionInfo?: IPeerDeletionInfo;
    status: RelationshipStatus;

    cache?: ICachedRelationship;
    cachedAt?: CoreDate;

    metadata?: any;
    metadataModifiedAt?: CoreDate;

    templateId: ICoreId;
}

@type("Relationship")
export class Relationship extends CoreSynchronizable implements IRelationship {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Relationship>((r) => r.relationshipSecretId),
        nameof<Relationship>((r) => r.peer),
        nameof<Relationship>((r) => r.status),
        nameof<Relationship>((r) => r.peerDeletionInfo)
    ];

    public override readonly metadataProperties = [nameof<Relationship>((r) => r.metadata), nameof<Relationship>((r) => r.metadataModifiedAt)];

    @validate()
    @serialize()
    public relationshipSecretId: CoreId;

    @validate()
    @serialize()
    public peer: Identity;

    @validate({ nullable: true })
    @serialize()
    public peerDeletionInfo?: PeerDeletionInfo;

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

    @validate()
    @serialize()
    public templateId: CoreId;

    public static override preFrom(value: any): any {
        if (value.cache.template && !value.templateId) {
            value = { ...value, templateId: value.cache.template.id };
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): Object {
        const json = super.toJSON(verbose, serializeAsString) as any;

        // Adds flattened peerAddress and templateId to the JSON stored in the database.
        // This helps us to boost the performance of database queries that include these fields.
        json.peerAddress = this.peer.address.toString();

        return json;
    }

    public static fromBackboneAndCreationContent(
        response: BackboneGetRelationshipResponse,
        peer: IIdentity,
        creationContent: ISerializable,
        relationshipSecretId: CoreId
    ): Relationship {
        const cache = CachedRelationship.from({
            creationContent,
            auditLog: RelationshipAuditLog.fromBackboneAuditLog(response.auditLog)
        });
        return Relationship.from({
            id: CoreId.from(response.id),
            relationshipSecretId: relationshipSecretId,
            peer: peer,
            status: RelationshipStatus.Pending,
            cache: cache,
            cachedAt: CoreDate.utc(),
            templateId: CoreId.from(response.relationshipTemplateId)
        });
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
}
