import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import _ from "lodash";
import { BackboneRelationshipAuditLog as BackboneAuditLog } from "../transmission/RelationshipAuditLog";
import { RelationshipAuditLogEntry } from "./RelationshipAuditLogEntry";

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
