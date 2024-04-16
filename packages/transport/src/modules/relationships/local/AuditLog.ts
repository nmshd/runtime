import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress, ICoreDate } from "../../../core";
import { AuditLogEntryReason, AuditLog as BackboneAuditLog } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface IAuditLogEntry {
    createdAt: ICoreDate;
    createdBy: ICoreAddress;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

@type("AuditLogEntry")
export class AuditLogEntry extends CoreSerializable implements IAuditLogEntry {
    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public reason: AuditLogEntryReason;

    @validate({ nullable: true })
    @serialize()
    public oldStatus?: RelationshipStatus;

    @validate()
    @serialize()
    public newStatus: RelationshipStatus;

    public static from(value: IAuditLogEntry): AuditLogEntry {
        return this.fromAny({ ...value, oldStatus: value.oldStatus ?? undefined });
    }
}

export class AuditLog {
    public static fromBackboneAuditLog(backboneAuditLog: BackboneAuditLog): AuditLogEntry[] {
        const auditLog: AuditLogEntry[] = [];
        backboneAuditLog.forEach((entry) =>
            auditLog.push(AuditLogEntry.from({ ...entry, createdAt: CoreDate.from(entry.createdAt), createdBy: CoreAddress.from(entry.createdBy) }))
        );
        return auditLog;
    }
}
