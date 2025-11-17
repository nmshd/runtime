import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem.js";

export interface DeleteAttributeRequestItemJSON extends RequestItemJSON {
    "@type": "DeleteAttributeRequestItem";
    attributeId: string;
}

export interface IDeleteAttributeRequestItem extends IRequestItem {
    attributeId: ICoreId;
}

@type("DeleteAttributeRequestItem")
export class DeleteAttributeRequestItem extends RequestItem implements IDeleteAttributeRequestItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    public static from(value: IDeleteAttributeRequestItem | Omit<DeleteAttributeRequestItemJSON, "@type"> | DeleteAttributeRequestItemJSON): DeleteAttributeRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DeleteAttributeRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as DeleteAttributeRequestItemJSON;
    }
}
