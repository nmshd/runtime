import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";

export interface LocalAttributeDTO {
    id: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    wasViewedAt?: string;
    isDefault?: true;
    peerSharingInfo?: PeerSharingInfoDTO;
    forwardedSharingInfos?: ForwardedSharingInfosDTO[];
}

export interface PeerSharingInfoDTO {
    peer: string;
    sourceReference: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
    initialAttributePeer?: string;
}

export interface ForwardedSharingInfosDTO {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
}

export interface LocalAttributeDeletionInfoDTO {
    deletionStatus: LocalAttributeDeletionStatus;
    deletionDate: string;
}

export enum LocalAttributeDeletionStatus {
    DeletionRequestSent = "DeletionRequestSent",
    DeletionRequestRejected = "DeletionRequestRejected",
    ToBeDeleted = "ToBeDeleted",
    ToBeDeletedByPeer = "ToBeDeletedByPeer",
    DeletedByPeer = "DeletedByPeer",
    DeletedByOwner = "DeletedByOwner"
}
