import { IdentityDeletionProcessStatus } from "@nmshd/transport";

export interface IdentityDeletionProcessDTO {
    id: string;
    createdAt?: string;
    createdByDevice?: string;
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
    rejectedAt?: string;
    rejectedByDevice?: string;
    status: IdentityDeletionProcessStatus;
}
