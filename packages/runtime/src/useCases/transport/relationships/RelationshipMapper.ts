import { ArbitraryRelationshipCreationContent, RelationshipCreationContent } from "@nmshd/content";
import { Relationship, RelationshipAuditLogEntry } from "@nmshd/transport";
import { RelationshipAuditLogEntryDTO, RelationshipDTO } from "../../../types";
import { RuntimeErrors } from "../../common";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";

export class RelationshipMapper {
    public static toRelationshipDTO(relationship: Relationship): RelationshipDTO {
        if (!relationship.cache) {
            throw RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString());
        }
        if (!(relationship.cache.creationContent instanceof RelationshipCreationContent || relationship.cache.creationContent instanceof ArbitraryRelationshipCreationContent)) {
            throw RuntimeErrors.general.invalidPropertyValue(
                `The creationContent type of relationship ${relationship.id} is neither RelationshipCreationContent nor ArbitraryRelationshipCreationContent.`
            );
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
            creationContent: relationship.cache.creationContent.toJSON()
        };
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
