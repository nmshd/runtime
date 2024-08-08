import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";
import { IRelationshipTemplate, RelationshipTemplate } from "../../relationshipTemplates/local/RelationshipTemplate";

export interface ISendRelationshipParameters extends ICoreSerializable {
    creationContent: ISerializable;
    template: IRelationshipTemplate;
}

@type("SendRelationshipParameters")
export class SendRelationshipParameters extends CoreSerializable implements ISendRelationshipParameters {
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
