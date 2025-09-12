import { IdentityDeletionProcessStatus } from "../data/IdentityDeletionProcessStatus";

export interface BackboneIdentityDeletionProcess {
    id: string;
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    approvalPeriodEndsAt?: string;
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}
