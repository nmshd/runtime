import { serialize, type, validate } from "@js-soft/ts-serval";
import { RequestItemJSON } from "../..";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface CreateAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "CreateAttributeRequestItem";
    attribute: RelationshipAttributeJSON | IdentityAttributeJSON;
}

export interface ICreateAttributeRequestItem extends IRequestItem {
    attribute: IRelationshipAttribute | IIdentityAttribute;
}

@type("CreateAttributeRequestItem")
export class CreateAttributeRequestItem extends RequestItem implements ICreateAttributeRequestItem {
    @validate()
    @serialize({ unionTypes: [RelationshipAttribute, IdentityAttribute] })
    public attribute: RelationshipAttribute | IdentityAttribute;

    public static from(value: ICreateAttributeRequestItem | Omit<CreateAttributeRequestItemJSON, "@type"> | CreateAttributeRequestItemJSON): CreateAttributeRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CreateAttributeRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as CreateAttributeRequestItemJSON;
    }
}
