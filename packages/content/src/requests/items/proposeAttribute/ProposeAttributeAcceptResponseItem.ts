import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface ProposeAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "ProposeAttributeAcceptResponseItem";
    attributeId: string;
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
}

export interface IProposeAttributeAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
    attribute: IIdentityAttribute | IRelationshipAttribute;
}

@type("ProposeAttributeAcceptResponseItem")
export class ProposeAttributeAcceptResponseItem extends AcceptResponseItem implements IProposeAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute;

    public static override from(value: IProposeAttributeAcceptResponseItem | ProposeAttributeAcceptResponseItemJSON): ProposeAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ProposeAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as ProposeAttributeAcceptResponseItemJSON;
    }
}
