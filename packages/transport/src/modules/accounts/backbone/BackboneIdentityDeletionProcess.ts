import { IdentityDeletionProcessStatus } from "../data/IdentityDeletionProcessStatus.js";

export interface BackboneIdentityDeletionProcess {
    id: string;
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}
