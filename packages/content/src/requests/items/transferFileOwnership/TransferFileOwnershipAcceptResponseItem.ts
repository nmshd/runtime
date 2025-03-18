import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "../../../attributes";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface TransferFileOwnershipAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "TransferFileOwnershipAcceptResponseItem";
    attributeId: string;
    attribute: IdentityAttributeJSON;
}

export interface ITransferFileOwnershipAcceptResponseItem extends IAcceptResponseItem {
    attributeId: ICoreId;
    attribute: IIdentityAttribute;
}

@type("TransferFileOwnershipAcceptResponseItem")
export class TransferFileOwnershipAcceptResponseItem extends AcceptResponseItem implements ITransferFileOwnershipAcceptResponseItem {
    @serialize()
    @validate()
    public attributeId: CoreId;

    @serialize()
    @validate()
    public attribute: IdentityAttribute;

    public static override from(
        value: ITransferFileOwnershipAcceptResponseItem | Omit<TransferFileOwnershipAcceptResponseItemJSON, "@type"> | TransferFileOwnershipAcceptResponseItemJSON
    ): TransferFileOwnershipAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TransferFileOwnershipAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as TransferFileOwnershipAcceptResponseItemJSON;
    }
}
