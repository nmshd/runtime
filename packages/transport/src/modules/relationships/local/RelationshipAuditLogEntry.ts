import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, CoreSerializable, ICoreAddress, ICoreDate, ICoreId } from "../../../core";
import { RelationshipAuditLogEntryReason } from "../transmission/RelationshipAuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface IRelationshipAuditLogEntry {
    createdAt: ICoreDate;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    reason: RelationshipAuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

@type("RelationshipAuditLogEntry")
export class RelationshipAuditLogEntry extends CoreSerializable implements IRelationshipAuditLogEntry {
    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize()
    public reason: RelationshipAuditLogEntryReason;

    @validate({ nullable: true })
    @serialize()
    public oldStatus?: RelationshipStatus;

    @validate()
    @serialize()
    public newStatus: RelationshipStatus;

    public static from(value: IRelationshipAuditLogEntry): RelationshipAuditLogEntry {
        return this.fromAny({ ...value, oldStatus: value.oldStatus ?? undefined });
    }
}
