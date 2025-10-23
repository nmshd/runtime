export interface LocalAttributeDeletionInfoDTO {
    deletionStatus: LocalAttributeDeletionStatus;
    deletionDate: string;
}

export type LocalAttributeDeletionStatus = "DeletionRequestSent" | "DeletionRequestRejected" | "ToBeDeleted" | "ToBeDeletedByRecipient" | "DeletedByRecipient" | "DeletedByEmitter";
