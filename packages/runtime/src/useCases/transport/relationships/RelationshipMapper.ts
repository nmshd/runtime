import { Serializable } from "@js-soft/ts-serval";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent } from "@nmshd/content";
import { RelationshipAuditLogEntryDTO, RelationshipDTO } from "@nmshd/runtime-types";
import { Relationship, RelationshipAuditLogEntry } from "@nmshd/transport";
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
            peerDeletionInfo: relationship.peerDeletionInfo?.toJSON(),
            peerIdentity: {
                address: relationship.peer.address.toString(),
                publicKey: relationship.peer.publicKey.toBase64(false)
            },
            auditLog: relationship.cache.auditLog.map((entry) => this.toAuditLogEntryDTO(entry)),
            creationContent: this.toCreationContent(relationship.cache.creationContent)
        };
    }

    private static toAuditLogEntryDTO(entry: RelationshipAuditLogEntry): RelationshipAuditLogEntryDTO {
        return {
            createdAt: entry.createdAt.toString(),
            createdBy: entry.createdBy.toString(),
            createdByDevice: entry.createdByDevice?.toString(),
            reason: entry.reason,
            oldStatus: entry.oldStatus,
            newStatus: entry.newStatus
        };
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }

    private static toCreationContent(content: Serializable) {
        if (!(content instanceof RelationshipCreationContent || content instanceof ArbitraryRelationshipCreationContent)) {
            return ArbitraryRelationshipCreationContent.from({ value: content }).toJSON();
        }
        return content.toJSON();
    }
}
