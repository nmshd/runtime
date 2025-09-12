export enum IdentityDeletionProcessStatus {
    WaitingForApproval = "WaitingForApproval",
    Rejected = "Rejected",
    Approved = "Approved",
    Cancelled = "Cancelled"
}

export interface IdentityDeletionProcessDTO {
    id: string;
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}
