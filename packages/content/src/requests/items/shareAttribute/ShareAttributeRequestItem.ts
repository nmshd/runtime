import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreId } from "@nmshd/core-types";
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "../../../attributes/index.js";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem.js";

export interface ShareAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "ShareAttributeRequestItem";
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    attributeId: string;
    initialAttributePeer?: string;
}

export interface IShareAttributeRequestItem extends IRequestItem {
    attribute: IIdentityAttribute | IRelationshipAttribute;
    attributeId: ICoreId;
    initialAttributePeer?: CoreAddress;
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
    public initialAttributePeer?: CoreAddress;

    public static from(value: IShareAttributeRequestItem | Omit<ShareAttributeRequestItemJSON, "@type"> | ShareAttributeRequestItemJSON): ShareAttributeRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareAttributeRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareAttributeRequestItemJSON;
    }
}
