import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { RelationshipAuditLogEntryReason } from "../transmission/RelationshipAuditLog.js";
import { RelationshipStatus } from "../transmission/RelationshipStatus.js";

export interface IRelationshipAuditLogEntry extends ISerializable {
    createdAt: ICoreDate;
    createdBy: ICoreAddress;
    createdByDevice?: ICoreId;
    reason: RelationshipAuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

@type("RelationshipAuditLogEntry")
export class RelationshipAuditLogEntry extends Serializable implements IRelationshipAuditLogEntry {
    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public createdByDevice?: CoreId;

    @validate({
        customValidator: (v) => (!Object.values(RelationshipAuditLogEntryReason).includes(v) ? `must be one of: ${Object.values(RelationshipAuditLogEntryReason)}` : undefined)
    })
    @serialize()
    public reason: RelationshipAuditLogEntryReason;

    @validate({
        nullable: true,
        customValidator: (v) => (!Object.values(RelationshipStatus).includes(v) ? `must be one of: ${Object.values(RelationshipStatus)}` : undefined)
    })
    @serialize()
    public oldStatus?: RelationshipStatus;

    @validate({
        customValidator: (v) => (!Object.values(RelationshipStatus).includes(v) ? `must be one of: ${Object.values(RelationshipStatus)}` : undefined)
    })
    @serialize()
    public newStatus: RelationshipStatus;

    public static from(value: IRelationshipAuditLogEntry): RelationshipAuditLogEntry {
        return this.fromAny({ ...value, oldStatus: value.oldStatus ?? undefined });
    }
}
