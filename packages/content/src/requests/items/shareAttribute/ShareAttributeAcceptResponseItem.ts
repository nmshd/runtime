import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface ShareAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "ShareAttributeAcceptResponseItem";
    attributeId: string;
}

export interface IShareAttributeAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
}

@type("ShareAttributeAcceptResponseItem")
export class ShareAttributeAcceptResponseItem extends AcceptResponseItem implements IShareAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    public static override from(
        value: IShareAttributeAcceptResponseItem | Omit<ShareAttributeAcceptResponseItemJSON, "@type"> | ShareAttributeAcceptResponseItemJSON
    ): ShareAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ShareAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as ShareAttributeAcceptResponseItemJSON;
    }
}
