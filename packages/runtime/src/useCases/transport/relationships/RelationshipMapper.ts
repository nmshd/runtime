import { BackboneRelationshipStatus, Relationship, RelationshipAuditLogEntry } from "@nmshd/transport";
import { RelationshipAuditLogEntryDTO, RelationshipDTO, RelationshipStatus } from "../../../types";
import { RuntimeErrors } from "../../common";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";

export class RelationshipMapper {
    public static toRelationshipDTO(relationship: Relationship): RelationshipDTO {
        if (!relationship.cache) {
            throw RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString());
        }

        return {
            id: relationship.id.toString(),
            template: RelationshipTemplateMapper.toRelationshipTemplateDTO(relationship.cache.template),
            status: this.toRelationshipStatus(relationship.status),
            peer: relationship.peer.address.toString(),
            peerIdentity: {
                address: relationship.peer.address.toString(),
                publicKey: relationship.peer.publicKey.toBase64(false)
            },
            auditLog: relationship.cache.auditLog.map((entry) => this.toAuditLogEntryDTO(entry)),
            creationContent: relationship.cache.creationContent?.toJSON()
        };
    }

    private static toAuditLogEntryDTO(entry: RelationshipAuditLogEntry): RelationshipAuditLogEntryDTO {
        return {
            createdAt: entry.createdAt.toString(),
            createdBy: entry.createdBy.toString(),
            createdByDevice: entry.createdByDevice.toString(),
            reason: entry.reason,
            oldStatus: entry.oldStatus ? this.toRelationshipStatus(entry.oldStatus) : undefined,
            newStatus: this.toRelationshipStatus(entry.newStatus)
        };
    }

    private static toRelationshipStatus(status: BackboneRelationshipStatus): RelationshipStatus {
        switch (status) {
            case BackboneRelationshipStatus.Active:
                return RelationshipStatus.Active;
            case BackboneRelationshipStatus.DeletionProposed:
                return RelationshipStatus.DecomposedByPeer;
            case BackboneRelationshipStatus.Pending:
                return RelationshipStatus.Pending;
            case BackboneRelationshipStatus.Rejected:
                return RelationshipStatus.Rejected;
            case BackboneRelationshipStatus.Revoked:
                return RelationshipStatus.Revoked;
            case BackboneRelationshipStatus.Terminated:
                return RelationshipStatus.Terminated;
        }
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }
}
