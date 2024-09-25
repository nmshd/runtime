import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { IRelationshipAuditLogEntry, RelationshipAuditLogEntry } from "./RelationshipAuditLogEntry";

export interface ICachedRelationship extends ISerializable {
    creationContent: ISerializable;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
    auditLog: IRelationshipAuditLogEntry[];
}

@type("CachedRelationship")
export class CachedRelationship extends Serializable implements ICachedRelationship {
    @validate()
    @serialize()
    public creationContent: Serializable;

    @validate({ nullable: true })
    @serialize()
    public lastMessageSentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public lastMessageReceivedAt?: CoreDate;

    @validate()
    @serialize({ type: RelationshipAuditLogEntry })
    public auditLog: RelationshipAuditLogEntry[];

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
