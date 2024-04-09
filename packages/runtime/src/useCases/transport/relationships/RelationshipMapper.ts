import { Relationship } from "@nmshd/transport";
import { AuditLog, RelationshipDTO } from "../../../types";
import { RuntimeErrors } from "../../common";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";

export class RelationshipMapper {
    public static toRelationshipDTO(relationship: Relationship): RelationshipDTO {
        if (!relationship.cache) {
            throw RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString());
        }

        const auditLogDTO: AuditLog = [];
        relationship.auditLog?.forEach((entry) => {
            auditLogDTO.push({ ...entry, createdAt: entry.createdAt.toString(), createdBy: entry.createdBy.toString() });
        });

        return {
            id: relationship.id.toString(),
            template: RelationshipTemplateMapper.toRelationshipTemplateDTO(relationship.cache.template),
            status: relationship.status,
            peer: relationship.peer.address.toString(),
            peerIdentity: {
                address: relationship.peer.address.toString(),
                publicKey: relationship.peer.publicKey.toBase64(false),
                realm: relationship.peer.realm
            },
            auditLog: auditLogDTO,
            creationContent: relationship.cache.creationContent
        };
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }
}
