import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreId } from "@nmshd/core-types";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface ReadAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "ReadAttributeAcceptResponseItem";
    attributeId: string;
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    thirdPartyAddress?: string;
}

export interface IReadAttributeAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
    attribute: IIdentityAttribute | IRelationshipAttribute;
    thirdPartyAddress?: CoreAddress;
}

@type("ReadAttributeAcceptResponseItem")
export class ReadAttributeAcceptResponseItem extends AcceptResponseItem implements IReadAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate({ nullable: true })
    public thirdPartyAddress?: CoreAddress;

    public static override from(
        value: IReadAttributeAcceptResponseItem | Omit<ReadAttributeAcceptResponseItemJSON, "@type"> | ReadAttributeAcceptResponseItemJSON
    ): ReadAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ReadAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as ReadAttributeAcceptResponseItemJSON;
    }
}
