import { Relationship, RelationshipChange, RelationshipChangeRequest, RelationshipChangeResponse } from "@nmshd/transport";
import { RelationshipChangeDTO, RelationshipChangeRequestDTO, RelationshipChangeResponseDTO, RelationshipDTO } from "../../../types";
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
                publicKey: relationship.peer.publicKey.toBase64(false),
                realm: relationship.peer.realm
            },
            changes: relationship.cache.changes.map((c) => this.toRelationshipChangeDTO(c))
        };
    }

    public static toRelationshipDTOList(relationships: Relationship[]): RelationshipDTO[] {
        return relationships.map((r) => this.toRelationshipDTO(r));
    }

    private static toRelationshipChangeRequestDTO(change: RelationshipChangeRequest): RelationshipChangeRequestDTO {
        return {
            createdBy: change.createdBy.toString(),
            createdByDevice: change.createdByDevice.toString(),
            createdAt: change.createdAt.toString(),
            content: change.content?.toJSON()
        };
    }

    private static toRelationshipChangeResponseDTO(change: RelationshipChangeResponse): RelationshipChangeResponseDTO {
        return {
            createdBy: change.createdBy.toString(),
            createdByDevice: change.createdByDevice.toString(),
            createdAt: change.createdAt.toString(),
            content: change.content?.toJSON()
        };
    }

    private static toRelationshipChangeDTO(change: RelationshipChange): RelationshipChangeDTO {
        return {
            id: change.id.toString(),
            request: this.toRelationshipChangeRequestDTO(change.request),
            status: change.status,
            type: change.type,
            response: change.response ? this.toRelationshipChangeResponseDTO(change.response) : undefined
        };
    }
}
