import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";
import { AuditLogEntryReason } from "../transmission/AuditLog";
import { RelationshipStatus } from "../transmission/RelationshipStatus";

export interface IAuditLogEntry {
    createdAt: CoreDate;
    createdBy: CoreAddress;
    reason: AuditLogEntryReason;
    oldStatus?: RelationshipStatus;
    newStatus: RelationshipStatus;
}

export interface IAuditLog extends Array<IAuditLogEntry> {}

export interface ICachedRelationship extends ICoreSerializable {
    template: IRelationshipTemplate;
    creationContent?: ISerializable;
    acceptanceContent?: ISerializable;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
    auditLog?: IAuditLog;
}

@type("CachedRelationship")
export class CachedRelationship extends CoreSerializable implements ICachedRelationship {
    @validate()
    @serialize()
    public template: RelationshipTemplate;

    @validate({ nullable: true })
    @serialize()
    public creationContent?: Serializable;

    @validate({ nullable: true })
    @serialize()
    public acceptanceContent?: Serializable;

    @validate({ nullable: true })
    @serialize()
    public lastMessageSentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public lastMessageReceivedAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public auditLog?: IAuditLog;

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
