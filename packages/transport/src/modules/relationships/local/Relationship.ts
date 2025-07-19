import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable, TransportError } from "../../../core";
import { Identity, IIdentity } from "../../accounts/data/Identity";
import { BackboneGetRelationshipResponse } from "../backbone/BackboneGetRelationships";
import { RelationshipStatus } from "../transmission/RelationshipStatus";
import { IPeerDeletionInfo, PeerDeletionInfo } from "./PeerDeletionInfo";
import { RelationshipAuditLog } from "./RelationshipAuditLog";
import { IRelationshipAuditLogEntry, RelationshipAuditLogEntry } from "./RelationshipAuditLogEntry";

export interface IRelationship extends ICoreSynchronizable {
    relationshipSecretId: ICoreId;
    peer: IIdentity;
    peerDeletionInfo?: IPeerDeletionInfo;
    status: RelationshipStatus;

    templateId: ICoreId;
    creationContent: ISerializable;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
    auditLog: IRelationshipAuditLogEntry[];

    metadata?: any;
    metadataModifiedAt?: CoreDate;
}

@type("Relationship")
export class Relationship extends CoreSynchronizable implements IRelationship {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Relationship>((r) => r.relationshipSecretId),
        nameof<Relationship>((r) => r.peer),
        nameof<Relationship>((r) => r.status),
        nameof<Relationship>((r) => r.peerDeletionInfo),
        nameof<Relationship>((r) => r.auditLog)
    ];

    public override readonly contentProperties = [
        nameof<Relationship>((r) => r.templateId),
        nameof<Relationship>((r) => r.creationContent),
        nameof<Relationship>((r) => r.lastMessageSentAt),
        nameof<Relationship>((r) => r.lastMessageReceivedAt)
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

    @validate()
    @serialize()
    public templateId: CoreId;

    @validate()
    @serialize()
    public creationContent: Serializable;

    @validate({ nullable: true })
    @serialize()
    public lastMessageSentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public lastMessageReceivedAt?: CoreDate;

    @validate()
    @serialize({ type: RelationshipAuditLogEntry })
    public auditLog: RelationshipAuditLogEntry[];

    @validate({ nullable: true })
    @serialize()
    public metadata?: any;

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate;

    public static fromBackboneAndCreationContent(
        response: BackboneGetRelationshipResponse,
        peer: IIdentity,
        creationContent: ISerializable,
        relationshipSecretId: CoreId
    ): Relationship {
        return Relationship.from({
            id: CoreId.from(response.id),
            relationshipSecretId: relationshipSecretId,
            peer: peer,
            status: RelationshipStatus.Pending,
            creationContent,
            templateId: CoreId.from(response.relationshipTemplateId),
            auditLog: RelationshipAuditLog.fromBackboneAuditLog(response.auditLog)
        });
    }

    public static from(value: IRelationship): Relationship {
        return this.fromAny(value);
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
