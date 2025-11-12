import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "../../../attributes/index.js";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response/index.js";

export interface AttributeSuccessionAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "AttributeSuccessionAcceptResponseItem";
    predecessorId: string;
    successorId: string;
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export interface IAttributeSuccessionAcceptResponseItem extends IAcceptResponseItem {
    predecessorId: ICoreId;
    successorId: ICoreId;
    successorContent: IIdentityAttribute | IRelationshipAttribute;
}

@type("AttributeSuccessionAcceptResponseItem")
export class AttributeSuccessionAcceptResponseItem extends AcceptResponseItem implements IAttributeSuccessionAcceptResponseItem {
    @serialize()
    @validate()
    public predecessorId: CoreId;

    @serialize()
    @validate()
    public successorId: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public successorContent: IdentityAttribute | RelationshipAttribute;

    public static override from(value: IAttributeSuccessionAcceptResponseItem | Omit<AttributeSuccessionAcceptResponseItemJSON, "@type">): AttributeSuccessionAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AttributeSuccessionAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as AttributeSuccessionAcceptResponseItemJSON;
    }
}
