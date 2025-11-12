import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import _ from "lodash";
import { BackboneRelationshipAuditLog as BackboneAuditLog } from "../transmission/RelationshipAuditLog.js";
import { RelationshipAuditLogEntry } from "./RelationshipAuditLogEntry.js";

export class RelationshipAuditLog {
    public static fromBackboneAuditLog(backboneAuditLog: BackboneAuditLog): RelationshipAuditLogEntry[] {
        const auditLog = backboneAuditLog.map((entry) => {
            return RelationshipAuditLogEntry.from({
                createdAt: CoreDate.from(entry.createdAt),
                createdBy: CoreAddress.from(entry.createdBy),
                createdByDevice: entry.createdByDevice ? CoreId.from(entry.createdByDevice) : undefined,
                reason: entry.reason,
                oldStatus: entry.oldStatus,
                newStatus: entry.newStatus
            });
        });

        return _.orderBy(auditLog, ["createdAt"], ["asc"]);
    }
}
