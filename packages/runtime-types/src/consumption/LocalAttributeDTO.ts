import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";

export interface LocalAttributeDTO {
    "@type": "OwnIdentityAttribute" | "PeerIdentityAttribute" | "OwnRelationshipAttribute" | "PeerRelationshipAttribute" | "ThirdPartyRelationshipAttribute";
    id: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    wasViewedAt?: string;
    isDefault?: true;
    peerSharingDetails?: PeerSharingDetailsDTO;
    forwardedSharingDetails?: ForwardedSharingDetailsDTO[];
}

export interface PeerSharingDetailsDTO {
    peer: string;
    sourceReference: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
    initialAttributePeer?: string;
}

export interface ForwardedSharingDetailsDTO {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
}

export interface LocalAttributeDeletionInfoDTO {
    deletionStatus: LocalAttributeDeletionStatus;
    deletionDate: string;
}

export type LocalAttributeDeletionStatus = "DeletionRequestSent" | "DeletionRequestRejected" | "ToBeDeleted" | "ToBeDeletedByRecipient" | "DeletedByRecipient" | "DeletedByEmitter";
