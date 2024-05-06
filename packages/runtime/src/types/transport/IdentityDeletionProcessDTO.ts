import { IdentityDeletionProcessStatus } from "@nmshd/transport";

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
    rejectedAt?: string;
    rejectedByDevice?: string;
}
