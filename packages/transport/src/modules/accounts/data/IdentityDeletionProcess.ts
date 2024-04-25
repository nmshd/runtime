import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable, ICoreSerializable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessJSON extends ICoreSerializable {
    id: string;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;

    createdAt?: string;
    createdByDevice?: string;

    // Approval period
    approvalReminder1SentAt?: string;
    approvalReminder2SentAt?: string;
    approvalReminder3SentAt?: string;

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

    // Grace Period
    gracePeriodReminder1SentAt?: string;
    gracePeriodReminder2SentAt?: string;
    gracePeriodReminder3SentAt?: string;

    // Deletion
    deletionStartedAt?: string; // Completion
    completedAt?: string;
    completedByDevice?: string;
}

export interface IIdentityDeletionProcess extends ICoreSerializable {
    id: CoreId;

    status: IdentityDeletionProcessStatus;

    createdAt?: CoreDate;
    createdByDevice?: CoreId;

    // Approval period
    // TODO: Wozu brauchen wir diese Infos hier?
    //       - mglw. unnötig; löschen
    approvalReminder1SentAt?: CoreDate;
    approvalReminder2SentAt?: CoreDate;
    approvalReminder3SentAt?: CoreDate;

    // Rejected
    rejectedAt?: CoreDate;
    rejectedByDevice?: CoreId;

    // Approval
    approvedAt?: CoreDate;
    approvedByDevice?: CoreId;
    gracePeriodEndsAt?: CoreDate;

    // Cancelled
    cancelledAt?: CoreDate;
    cancelledByDevice?: CoreId;

    // Grace Period
    // TODO: mglw. unnötig (s.o.)
    gracePeriodReminder1SentAt?: CoreDate;
    gracePeriodReminder2SentAt?: CoreDate;
    gracePeriodReminder3SentAt?: CoreDate;
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSerializable implements IIdentityDeletionProcess {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public status: IdentityDeletionProcessStatus;

    @validate({ nullable: true })
    @serialize()
    public createdAt?: CoreDate;

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
    public cancelledAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public cancelledByDevice?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public rejectedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public rejectedByDevice?: CoreId;

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

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}

/**
 * Fragen:
 *
 * TODO: Wie erhält App Benachrichtigung über ausstehenden DeletionProcess (Admin UI)?
 */
