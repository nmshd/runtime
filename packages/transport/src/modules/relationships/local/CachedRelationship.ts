import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { IRelationshipAuditLogEntry, RelationshipAuditLogEntry } from "./RelationshipAuditLogEntry";

export interface ICachedRelationship extends ISerializable {
    templateId: ICoreId;
    creationContent: ISerializable;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
    auditLog: IRelationshipAuditLogEntry[];
}

@type("CachedRelationship")
export class CachedRelationship extends Serializable implements ICachedRelationship {
    @validate()
    @serialize()
    public templateId: CoreId;

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

    public static override preFrom(value: any): any {
        if (typeof value.template !== "undefined") {
            value.templateId = value.template.id;
            delete value.template;
        }

        return value;
    }

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
