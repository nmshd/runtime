import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface IdentityDeletionProcessJSON {
    id: string;
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    approvalPeriodEndsAt?: string;
    rejectedAt?: string;
    rejectedByDevice?: string;
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}

export interface IIdentityDeletionProcess {
    id: CoreId;
    status: IdentityDeletionProcessStatus;
    createdAt?: CoreDate;
    createdByDevice?: CoreId;
    approvalPeriodEndsAt?: CoreDate;
    rejectedAt?: CoreDate;
    rejectedByDevice?: CoreId;
    approvedAt?: CoreDate;
    approvedByDevice?: CoreId;
    gracePeriodEndsAt?: CoreDate;
    cancelledAt?: CoreDate;
    cancelledByDevice?: CoreId;
}

@type("IdentityDeletionProcess")
export class IdentityDeletionProcess extends CoreSynchronizable implements IIdentityDeletionProcess {
    public override readonly technicalProperties = [
        nameof<IdentityDeletionProcess>((r) => r.id),
        nameof<IdentityDeletionProcess>((r) => r.status),
        nameof<IdentityDeletionProcess>((r) => r.createdAt),
        nameof<IdentityDeletionProcess>((r) => r.createdByDevice),
        nameof<IdentityDeletionProcess>((r) => r.approvalPeriodEndsAt)
    ];

    public override readonly contentProperties = [
        nameof<IdentityDeletionProcess>((r) => r.rejectedAt),
        nameof<IdentityDeletionProcess>((r) => r.rejectedByDevice),
        nameof<IdentityDeletionProcess>((r) => r.approvedAt),
        nameof<IdentityDeletionProcess>((r) => r.approvedByDevice),
        nameof<IdentityDeletionProcess>((r) => r.gracePeriodEndsAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledAt),
        nameof<IdentityDeletionProcess>((r) => r.cancelledByDevice)
    ];

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
    public approvalPeriodEndsAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public rejectedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public rejectedByDevice?: CoreId;

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

    public static from(value: IIdentityDeletionProcess | IdentityDeletionProcessJSON): IdentityDeletionProcess {
        return this.fromAny(value);
    }
}
