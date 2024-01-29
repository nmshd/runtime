import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { RequestItemJSON } from "../..";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "../../../attributes";
import { IRequestItem, RequestItem } from "../../RequestItem";

export interface ShareAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "ShareAttributeRequestItem";
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    sourceAttributeId: string;
}

export interface IShareAttributeRequestItem extends IRequestItem {
    attribute: IIdentityAttribute | IRelationshipAttribute;
    sourceAttributeId: ICoreId;
}

@type("ShareAttributeRequestItem")
export class ShareAttributeRequestItem extends RequestItem implements IShareAttributeRequestItem {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute;

    @serialize()
    @validate()
    public sourceAttributeId: CoreId;

    public static from(value: IShareAttributeRequestItem | Omit<ShareAttributeRequestItemJSON, "@type">): ShareAttributeRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareAttributeRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareAttributeRequestItemJSON;
    }
}
