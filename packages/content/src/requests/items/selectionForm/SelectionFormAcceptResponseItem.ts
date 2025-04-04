import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface SelectionFormAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "SelectionFormAcceptResponseItem";
    options: string[];
}

export interface ISelectionFormAcceptResponseItem extends IAcceptResponseItem {
    options: string[];
}

@type("SelectionFormAcceptResponseItem")
export class SelectionFormAcceptResponseItem extends AcceptResponseItem implements ISelectionFormAcceptResponseItem {
    @serialize({ type: String })
    @validate()
    public options: string[];

    public static override from(
        value: ISelectionFormAcceptResponseItem | Omit<SelectionFormAcceptResponseItemJSON, "@type"> | SelectionFormAcceptResponseItemJSON
    ): SelectionFormAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormAcceptResponseItemJSON;
    }
}
