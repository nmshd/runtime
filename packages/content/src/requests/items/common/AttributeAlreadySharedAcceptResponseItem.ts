import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response/index.js";

export interface AttributeAlreadySharedAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "AttributeAlreadySharedAcceptResponseItem";
    attributeId: string;
}

export interface IAttributeAlreadySharedAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
}

@type("AttributeAlreadySharedAcceptResponseItem")
export class AttributeAlreadySharedAcceptResponseItem extends AcceptResponseItem implements IAttributeAlreadySharedAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    public static override from(
        value: IAttributeAlreadySharedAcceptResponseItem | Omit<AttributeAlreadySharedAcceptResponseItemJSON, "@type">
    ): AttributeAlreadySharedAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AttributeAlreadySharedAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as AttributeAlreadySharedAcceptResponseItemJSON;
    }
}
