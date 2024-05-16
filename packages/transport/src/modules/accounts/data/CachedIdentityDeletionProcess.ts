import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable } from "../../../core";
import { IdentityDeletionProcessStatus } from "./IdentityDeletionProcessStatus";

export interface CachedIdentityDeletionProcessJSON {
    status: IdentityDeletionProcessStatus;
    createdAt?: string;
    createdByDevice?: string;
    rejectedAt?: string;
    rejectedByDevice?: string;
    approvedAt?: string;
    approvedByDevice?: string;
    gracePeriodEndsAt?: string;
    cancelledAt?: string;
    cancelledByDevice?: string;
}

export interface ICachedIdentityDeletionProcess {
    status: IdentityDeletionProcessStatus;
    createdAt?: CoreDate;
    createdByDevice?: CoreId;
    rejectedAt?: CoreDate;
    rejectedByDevice?: CoreId;
    approvedAt?: CoreDate;
    approvedByDevice?: CoreId;
    gracePeriodEndsAt?: CoreDate;
    cancelledAt?: CoreDate;
    cancelledByDevice?: CoreId;
}

@type("CachedIdentityDeletionProcess")
export class CachedIdentityDeletionProcess extends CoreSerializable implements ICachedIdentityDeletionProcess {
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

    public static from(value: ICachedIdentityDeletionProcess | CachedIdentityDeletionProcessJSON): CachedIdentityDeletionProcess {
        return this.fromAny(value);
    }
}
