import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { CoreDate, CoreId, CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessJSON extends ICoreSynchronizable {
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

export interface IIdentityDeletionProcess extends ICoreSynchronizable {
    // Cross Cutting
    status: IdentityDeletionProcessStatus;

    createdAt?: CoreDate;
    createdByDevice?: CoreId;

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
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSynchronizable implements IIdentityDeletionProcess {
    public override readonly technicalProperties = [
        nameof<IdentityDeletionProcess>((r) => r.status),
        nameof<IdentityDeletionProcess>((r) => r.createdAt),
        nameof<IdentityDeletionProcess>((r) => r.createdByDevice),
        nameof<IdentityDeletionProcess>((r) => r.approvalReminder1SentAt),
        nameof<IdentityDeletionProcess>((r) => r.approvalReminder2SentAt),
        nameof<IdentityDeletionProcess>((r) => r.approvalReminder3SentAt),
        nameof<IdentityDeletionProcess>((r) => r.approvedAt),
        nameof<IdentityDeletionProcess>((r) => r.approvedByDevice),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodEndsAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledByDevice),
        nameof<IdentityDeletionProcess>((r) => r.rejectedAt),
        nameof<IdentityDeletionProcess>((r) => r.rejectedByDevice),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodReminder1SentAt),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodReminder2SentAt),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodReminder3SentAt),
        nameof<IdentityDeletionProcess>((r) => r.deletionStartedAt),
        nameof<IdentityDeletionProcess>((r) => r.completedAt),
        nameof<IdentityDeletionProcess>((r) => r.completedByDevice)
    ];
    public override readonly userdataProperties = [];
    public override readonly metadataProperties = [];

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
