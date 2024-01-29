import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";
import { IRelationshipChange, RelationshipChange } from "../transmission/changes/RelationshipChange";

export interface ICachedRelationship extends ICoreSerializable {
    template: IRelationshipTemplate;
    changes: IRelationshipChange[];

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
}

@type("CachedRelationship")
export class CachedRelationship extends CoreSerializable implements ICachedRelationship {
    @validate()
    @serialize()
    public template: RelationshipTemplate;

    @validate()
    @serialize({ type: RelationshipChange })
    public changes: RelationshipChange[];

    @validate({ nullable: true })
    @serialize()
    public lastMessageSentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public lastMessageReceivedAt?: CoreDate;

    public get creationChange(): RelationshipChange {
        return this.changes[0];
    }

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
