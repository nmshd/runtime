import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "../../../core";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";

export interface ICachedRelationship extends ICoreSerializable {
    template: IRelationshipTemplate;
    creationContent?: any;

    lastMessageSentAt?: ICoreDate;
    lastMessageReceivedAt?: ICoreDate;
}

@type("CachedRelationship")
export class CachedRelationship extends CoreSerializable implements ICachedRelationship {
    @validate()
    @serialize()
    public template: RelationshipTemplate;

    @validate({ nullable: true })
    @serialize()
    public creationContent?: any;

    @validate({ nullable: true })
    @serialize()
    public lastMessageSentAt?: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public lastMessageReceivedAt?: CoreDate;

    public static from(value: ICachedRelationship): CachedRelationship {
        return this.fromAny(value);
    }
}
