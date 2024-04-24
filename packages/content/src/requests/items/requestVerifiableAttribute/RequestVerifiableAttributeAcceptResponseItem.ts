import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";
import { CoreId, ICoreId } from "@nmshd/transport";

export interface RequestVerifiableAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "RequestVerifiableAttributeAcceptResponseItem";
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    attributeId: string;
}

export interface IRequestVerifiableAttributeAcceptResponseItem extends IAcceptResponseItem {
    attribute: IIdentityAttribute | IRelationshipAttribute;
    attributeId: ICoreId;
}

@type("ProposeAttributeAcceptResponseItem")
export class RequestVerifiableAttributeAcceptResponseItem extends AcceptResponseItem implements IRequestVerifiableAttributeAcceptResponseItem {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public attributeId: CoreId;

    public static override from(
        value: IRequestVerifiableAttributeAcceptResponseItem | RequestVerifiableAttributeAcceptResponseItemJSON
    ): RequestVerifiableAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RequestVerifiableAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as RequestVerifiableAttributeAcceptResponseItemJSON;
    }
}
