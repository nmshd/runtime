import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable, ICoreSerializable } from "../../../core";
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
    // auditLog?: IdentityDeletionProcessAuditLogEntry[];
}

export interface IIdentityDeletionProcess extends ICoreSerializable {
    id: CoreId;

    createdAt: CoreDate;
    createdByDevice?: CoreId;

    // Approval period
    // TODO: Wozu brauchen wir diese Infos hier?
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
    // TODO: was genau bedeutet dieses Feld?
    deletionStartedAt?: CoreDate; // Completion

    // TODO: Kann ich diese Information jemals abrufen?
    completedAt?: CoreDate;

    // TODO: byDevice? Und wozu brauche ich das Feld (in Runtime)?
    completedByDevice?: CoreId;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;
    // auditLog?: IdentityDeletionProcessAuditLogEntry[];
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

    // @validate()
    // @serialize()
    // public auditLog?: IdentityDeletionProcessAuditLogEntry[];

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}

/**
 * Fragen:
 *
 * TODO: Wie erhält App Benachrichtigung über ausstehenden DeletionProcess (Admin UI)?
 */
