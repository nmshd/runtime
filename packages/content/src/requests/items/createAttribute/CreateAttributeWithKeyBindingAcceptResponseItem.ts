import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface CreateAttributeWithKeyBindingAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "CreateAttributeWithKeyBindingAcceptResponseItem";
    jwk: unknown;
}

export interface ICreateAttributeWithKeyBindingAcceptResponseItem extends IAcceptResponseItem {
    jwk: unknown;
}

@type("CreateAttributeWithKeyBindingAcceptResponseItem")
export class CreateAttributeWithKeyBindingAcceptResponseItem extends AcceptResponseItem implements ICreateAttributeWithKeyBindingAcceptResponseItem {
    @serialize()
    @validate()
    public jwk: unknown;

    public static override from(
        value:
            | ICreateAttributeWithKeyBindingAcceptResponseItem
            | Omit<CreateAttributeWithKeyBindingAcceptResponseItemJSON, "@type">
            | CreateAttributeWithKeyBindingAcceptResponseItemJSON
    ): CreateAttributeWithKeyBindingAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CreateAttributeWithKeyBindingAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as CreateAttributeWithKeyBindingAcceptResponseItemJSON;
    }
}
