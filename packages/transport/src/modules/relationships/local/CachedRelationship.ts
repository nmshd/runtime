import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";
import { AuditLogEntry, IAuditLogEntry } from "./AuditLog";

export interface ICachedRelationship extends ICoreSerializable {
    template: IRelationshipTemplate;
    creationContent?: ISerializable;
    acceptanceContent?: ISerializable;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
    auditLog?: IAuditLogEntry[];
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
    public auditLog?: AuditLogEntry[];

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
