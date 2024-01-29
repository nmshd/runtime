import { type } from "@js-soft/ts-serval";
import { BackboneIds, IReference, Reference } from "../../../core";

export interface IRelationshipTemplateReference extends IReference {}

@type("RelationshipTemplateReference")
export class RelationshipTemplateReference extends Reference implements IRelationshipTemplateReference {
    protected static override preFrom(value: any): any {
        super.validateId(value, BackboneIds.relationshipTemplate);

        return value;
    }

    public static override from(value: IRelationshipTemplateReference | string): RelationshipTemplateReference {
        return super.from(value);
    }
}
