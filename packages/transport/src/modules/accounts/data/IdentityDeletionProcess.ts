import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { CoreDate, CoreId, CoreSynchronizable, ICoreSynchronizable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessJSON extends Omit<ICoreSynchronizable, "id"> {
    id: string;

    // Cross Cutting
    status: IdentityDeletionProcessStatus;

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
}

export interface IIdentityDeletionProcess extends ICoreSynchronizable {
    // Cross Cutting
    status: IdentityDeletionProcessStatus;

    createdAt?: CoreDate;
    createdByDevice?: CoreId;

    // Approval
    approvedAt?: CoreDate;
    approvedByDevice?: CoreId;
    gracePeriodEndsAt?: CoreDate;

    // Cancelled
    cancelledAt?: CoreDate;
    cancelledByDevice?: CoreId;

    // Rejected
    rejectedAt?: CoreDate;
    rejectedByDevice?: CoreId;
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSynchronizable implements IIdentityDeletionProcess {
    public override readonly technicalProperties = [
        nameof<IdentityDeletionProcess>((r) => r.status),
        nameof<IdentityDeletionProcess>((r) => r.createdAt),
        nameof<IdentityDeletionProcess>((r) => r.createdByDevice),
        nameof<IdentityDeletionProcess>((r) => r.approvedAt),
        nameof<IdentityDeletionProcess>((r) => r.approvedByDevice),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodEndsAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledByDevice),
        nameof<IdentityDeletionProcess>((r) => r.rejectedAt),
        nameof<IdentityDeletionProcess>((r) => r.rejectedByDevice)
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

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}

/**
 * Fragen:
 *
 * TODO: Wie erhält App Benachrichtigung über ausstehenden DeletionProcess (Admin UI)?
 */
