import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";

export interface LocalAttributeDTO {
    id: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    shareInfo?: LocalAttributeShareInfoDTO;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
    isDefault?: true;
    wasViewedAt?: string;
}

export interface LocalAttributeShareInfoDTO {
    requestReference?: string;
    notificationReference?: string;
    peer: string;
    sourceAttribute?: string;
    thirdPartyAddress?: string;
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
