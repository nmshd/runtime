import { serialize, type, validate } from "@js-soft/ts-serval";
import _ from "lodash";
import { CoreAddress, CoreDate, CoreId, CoreSerializable, ICoreAddress, ICoreDate, ICoreId } from "../../../core";
import { AuditLogEntryReason, AuditLog as BackboneAuditLog } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface IRelationshipAuditLogEntry {
    createdAt: ICoreDate;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    reason: AuditLogEntryReason;
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
    public reason: AuditLogEntryReason;

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

export class RelationshipAuditLog {
    public static fromBackboneAuditLog(backboneAuditLog: BackboneAuditLog): RelationshipAuditLogEntry[] {
        const auditLog = backboneAuditLog.map((entry) => {
            return RelationshipAuditLogEntry.from({
                createdAt: CoreDate.from(entry.createdAt),
                createdBy: CoreAddress.from(entry.createdBy),
                createdByDevice: CoreId.from(entry.createdByDevice),
                reason: entry.reason,
                oldStatus: entry.oldStatus,
                newStatus: entry.newStatus
            });
        });
        return _.orderBy(auditLog, ["createdAt"], ["asc"]);
    }
}
