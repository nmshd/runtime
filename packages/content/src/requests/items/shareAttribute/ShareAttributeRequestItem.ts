import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreId } from "@nmshd/core-types";
import { RequestItemJSON } from "../..";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface ShareAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "ShareAttributeRequestItem";
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    attributeId: string;
    thirdPartyAddress?: string;
}

export interface IShareAttributeRequestItem extends IRequestItem {
    attribute: IIdentityAttribute | IRelationshipAttribute;
    attributeId: ICoreId;
    thirdPartyAddress?: CoreAddress;
}

@type("ShareAttributeRequestItem")
export class ShareAttributeRequestItem extends RequestItem implements IShareAttributeRequestItem {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public attributeId: CoreId;

    @serialize()
    @validate({ nullable: true })
    public thirdPartyAddress?: CoreAddress;

    public static from(value: IShareAttributeRequestItem | Omit<ShareAttributeRequestItemJSON, "@type"> | ShareAttributeRequestItemJSON): ShareAttributeRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareAttributeRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareAttributeRequestItemJSON;
    }
}
