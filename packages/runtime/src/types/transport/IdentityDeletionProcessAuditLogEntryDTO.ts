import { IdentityDeletionProcessStatus } from "@nmshd/transport";

export interface IdentityDeletionProcessAuditLogEntryDTO {
    id: string;
    processId: string;
    createdAt: string;
    message: string;
    identityAddressHash: string;
    deviceIdHash?: string;
    oldStatus?: IdentityDeletionProcessStatus;
    newStatus: IdentityDeletionProcessStatus;
}
