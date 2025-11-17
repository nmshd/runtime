import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate.js";

export interface ISendRelationshipParameters extends ISerializable {
    creationContent: ISerializable;
    template: IRelationshipTemplate;
}

@type("SendRelationshipParameters")
export class SendRelationshipParameters extends Serializable implements ISendRelationshipParameters {
    @validate()
    @serialize()
    public creationContent: Serializable;

    @validate()
    @serialize()
    public template: RelationshipTemplate;

    public static from(value: ISendRelationshipParameters): SendRelationshipParameters {
        return this.fromAny(value);
    }
}
