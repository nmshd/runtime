import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface RequestVerifiableAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "RequestVerifiableAttributeAcceptResponseItem";
    attribute: IdentityAttributeJSON;
    attributeId: string;
}

export interface IRequestVerifiableAttributeAcceptResponseItem extends IAcceptResponseItem {
    attribute: IIdentityAttribute;
    attributeId: ICoreId;
}

@type("ProposeAttributeAcceptResponseItem")
export class RequestVerifiableAttributeAcceptResponseItem extends AcceptResponseItem implements IRequestVerifiableAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public attribute: IdentityAttribute;

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
