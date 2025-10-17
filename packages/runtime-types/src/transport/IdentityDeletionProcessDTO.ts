export enum IdentityDeletionProcessStatus {
    Active = "Active",
    Cancelled = "Cancelled"
}

export interface IdentityDeletionProcessDTO {
    id: string;
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}
