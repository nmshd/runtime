import { IdentityDeletionProcessStatus } from "@nmshd/transport";

export interface IdentityDeletionProcessDTO {
    id: string;

    createdAt?: string;
    createdByDevice?: string;

    // Approval
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;

    // Cancelled
    cancelledAt?: string;
    cancelledByDevice?: string;

    // Rejected
    rejectedAt?: string;
    rejectedByDevice?: string;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;
}
