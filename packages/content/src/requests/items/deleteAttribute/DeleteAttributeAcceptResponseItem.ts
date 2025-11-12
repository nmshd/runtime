import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response/index.js";

export interface DeleteAttributeAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "DeleteAttributeAcceptResponseItem";
    deletionDate: string;
}

export interface IDeleteAttributeAcceptResponseItem extends IAcceptResponseItem {
    deletionDate: ICoreDate;
}

@type("DeleteAttributeAcceptResponseItem")
export class DeleteAttributeAcceptResponseItem extends AcceptResponseItem implements IDeleteAttributeAcceptResponseItem {
    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static override from(
        value: IDeleteAttributeAcceptResponseItem | Omit<DeleteAttributeAcceptResponseItemJSON, "@type"> | DeleteAttributeAcceptResponseItemJSON
    ): DeleteAttributeAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DeleteAttributeAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as DeleteAttributeAcceptResponseItemJSON;
    }
}
