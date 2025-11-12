import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { LocalAttributeDeletionInfoDTO } from "./LocalAttributeDeletionInfoDTO.js";

export interface LocalAttributeDTO {
    "@type": "OwnIdentityAttribute" | "PeerIdentityAttribute" | "OwnRelationshipAttribute" | "PeerRelationshipAttribute" | "ThirdPartyRelationshipAttribute";
    id: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    wasViewedAt?: string;
    isDefault?: true;
    peer?: string;
    sourceReference?: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
    initialAttributePeer?: string;
    numberOfForwards?: number;
}
