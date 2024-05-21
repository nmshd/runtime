import { Relationship, RelationshipAuditLogEntry } from "@nmshd/transport";
import { RelationshipAuditLogEntryDTO, RelationshipAuditLogEntryReason, RelationshipChangeStatus, RelationshipChangeType, RelationshipDTO } from "../../../types";
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
            status: relationship.status,
            peer: relationship.peer.address.toString(),
            peerIdentity: {
                address: relationship.peer.address.toString(),
                publicKey: relationship.peer.publicKey.toBase64(false)
            },
            auditLog: relationship.cache.auditLog.map((entry) => this.toAuditLogEntryDTO(entry)),
            creationContent: relationship.cache.creationContent?.toJSON(),
            changes: [
                {
                    id: "RCH00000000000000001",
                    request: {
                        createdAt: relationship.cache.auditLog[0].createdAt.toString(),
                        createdBy: relationship.cache.auditLog[0].createdBy.toString(),
                        createdByDevice: relationship.cache.auditLog[0].createdByDevice.toString(),
                        content: { ...relationship.cache.creationContent?.toJSON(), "@type": "RelationshipCreationChangeRequestContent" }
                    },
                    status: this.getStatus(relationship.cache.auditLog),
                    type: RelationshipChangeType.Creation
                }
            ]
        };
    }

    private static getStatus(auditLog: RelationshipAuditLogEntry[]): RelationshipChangeStatus {
        switch (auditLog[1]?.reason) {
            case RelationshipAuditLogEntryReason.AcceptanceOfCreation:
                return RelationshipChangeStatus.Accepted;
            case RelationshipAuditLogEntryReason.RejectionOfCreation:
                return RelationshipChangeStatus.Rejected;
            case RelationshipAuditLogEntryReason.RevocationOfCreation:
                return RelationshipChangeStatus.Revoked;
            default:
                return RelationshipChangeStatus.Pending;
        }
    }

    private static toAuditLogEntryDTO(entry: RelationshipAuditLogEntry): RelationshipAuditLogEntryDTO {
        return {
            createdAt: entry.createdAt.toString(),
            createdBy: entry.createdBy.toString(),
            createdByDevice: entry.createdByDevice.toString(),
            reason: entry.reason,
            oldStatus: entry.oldStatus,
            newStatus: entry.newStatus
        };
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }
}
