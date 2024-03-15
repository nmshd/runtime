import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface AttributeSuccessionAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "AttributeSuccessionAcceptResponseItem";
    successorId: string;
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON;
    predecessorId: string;
}

export interface IAttributeSuccessionAcceptResponseItem extends IAcceptResponseItem {
    successorId: ICoreId;
    successorContent: IIdentityAttribute | IRelationshipAttribute;
    predecessorId: ICoreId;
}

@type("AttributeSuccessionAcceptResponseItem")
export class AttributeSuccessionAcceptResponseItem extends AcceptResponseItem implements IAttributeSuccessionAcceptResponseItem {
    @serialize()
    @validate()
    public successorId: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public successorContent: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public predecessorId: CoreId;

    public static override from(value: IAttributeSuccessionAcceptResponseItem | Omit<AttributeSuccessionAcceptResponseItemJSON, "@type">): AttributeSuccessionAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AttributeSuccessionAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as AttributeSuccessionAcceptResponseItemJSON;
    }
}
