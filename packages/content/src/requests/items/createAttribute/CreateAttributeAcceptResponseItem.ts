import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/transport";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface CreateAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "CreateAttributeAcceptResponseItem";
    attributeId: string;
}

export interface ICreateAttributeAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
}

@type("CreateAttributeAcceptResponseItem")
export class CreateAttributeAcceptResponseItem extends AcceptResponseItem implements ICreateAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    public static override from(value: ICreateAttributeAcceptResponseItem | Omit<CreateAttributeAcceptResponseItemJSON, "@type">): CreateAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CreateAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as CreateAttributeAcceptResponseItemJSON;
    }
}
