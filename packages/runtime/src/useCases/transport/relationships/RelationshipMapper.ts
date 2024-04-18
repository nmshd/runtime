import { AuditLogEntry, Relationship } from "@nmshd/transport";
import { AuditLogEntryDTO, AuditLogEntryReason, RelationshipChangeStatus, RelationshipChangeType, RelationshipDTO } from "../../../types";
import { RuntimeErrors } from "../../common";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";

export class RelationshipMapper {
    public static toRelationshipDTO(relationship: Relationship): RelationshipDTO {
        if (!relationship.cache) {
            throw RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString());
        }

        const dtoWithoutChanges = {
            id: relationship.id.toString(),
            template: RelationshipTemplateMapper.toRelationshipTemplateDTO(relationship.cache.template),
            status: relationship.status,
            peer: relationship.peer.address.toString(),
            peerIdentity: {
                address: relationship.peer.address.toString(),
                publicKey: relationship.peer.publicKey.toBase64(false),
                realm: relationship.peer.realm
            },
            auditLog: relationship.cache.auditLog.map((entry) => this.toAuditLogEntryDTO(entry)),
            creationContent: relationship.cache.creationContent?.toJSON()
        };
        return {
            ...dtoWithoutChanges,
            changes: [
                {
                    id: "RCH00000000000000001",
                    request: {
                        createdAt: dtoWithoutChanges.auditLog[0].createdAt,
                        createdBy: dtoWithoutChanges.auditLog[0].createdBy,
                        createdByDevice: "DVC00000000000000001",
                        content: dtoWithoutChanges.creationContent
                    },
                    status: this.getStatus(dtoWithoutChanges.auditLog),
                    type: RelationshipChangeType.Creation
                }
            ]
        };
    }

    private static getStatus(auditLog: AuditLogEntryDTO[]): RelationshipChangeStatus {
        switch (auditLog[1]?.reason) {
            case undefined:
                return RelationshipChangeStatus.Pending;
            case AuditLogEntryReason.AcceptanceOfCreation:
                return RelationshipChangeStatus.Accepted;
            case AuditLogEntryReason.RejectionOfCreation:
                return RelationshipChangeStatus.Rejected;
            case AuditLogEntryReason.RevocationOfCreation:
                return RelationshipChangeStatus.Revoked;
            default:
                throw RuntimeErrors.relationships.faultyRelationshipAuditLog();
        }
    }

    private static toAuditLogEntryDTO(entry: AuditLogEntry): AuditLogEntryDTO {
        return {
            createdAt: entry.createdAt.toString(),
            createdBy: entry.createdBy.toString(),
            reason: entry.reason,
            oldStatus: entry.oldStatus,
            newStatus: entry.newStatus
        };
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }
}
