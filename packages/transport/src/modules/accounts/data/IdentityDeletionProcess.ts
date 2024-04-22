import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable, ICoreSerializable } from "../../../core";
import { IdentityDeletionProcessAuditLogEntry } from "./IdentityDeletionProcessAuditLogEntry";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessJSON extends ICoreSerializable {
    id: string;

    createdAt: string;
    createdByDevice?: string;

    // Approval period
    approvalReminder1SentAt?: string;
    approvalReminder2SentAt?: string;
    approvalReminder3SentAt?: string;

    // Approval
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;

    // Grace Period
    gracePeriodReminder1SentAt?: string;
    gracePeriodReminder2SentAt?: string;
    gracePeriodReminder3SentAt?: string;

    // Deletion
    deletionStartedAt?: string; // Completion
    completedAt?: string;
    completedByDevice?: string;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;
    auditLog: IdentityDeletionProcessAuditLogEntry[];
}

export interface IIdentityDeletionProcess extends ICoreSerializable {
    id: CoreId;

    createdAt: CoreDate;
    createdByDevice?: CoreId;

    // Approval period
    approvalReminder1SentAt?: CoreDate;
    approvalReminder2SentAt?: CoreDate;
    approvalReminder3SentAt?: CoreDate;

    // Approval
    approvedAt?: CoreDate;
    approvedByDevice?: CoreId;
    gracePeriodEndsAt?: CoreDate;

    // Grace Period
    gracePeriodReminder1SentAt?: CoreDate;
    gracePeriodReminder2SentAt?: CoreDate;
    gracePeriodReminder3SentAt?: CoreDate;

    // Deletion
    deletionStartedAt?: CoreDate; // Completion
    completedAt?: CoreDate;
    completedByDevice?: CoreId;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;
    auditLog: IdentityDeletionProcessAuditLogEntry[];
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSerializable implements IIdentityDeletionProcess {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public createdByDevice?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public approvalReminder1SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public approvalReminder2SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public approvalReminder3SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public approvedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public approvedByDevice?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public gracePeriodEndsAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public gracePeriodReminder1SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public gracePeriodReminder2SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public gracePeriodReminder3SentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public deletionStartedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public completedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public completedByDevice?: CoreId;

    @validate()
    @serialize()
    public status: IdentityDeletionProcessStatus;

    @validate()
    @serialize()
    public auditLog: IdentityDeletionProcessAuditLogEntry[];

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON | Omit<IdentityDeletionProcessJSON, "@type">): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}
