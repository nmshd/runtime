import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface SelectionAcceptFormResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "SelectionAcceptFormResponseItem";
    options: string[];
}

export interface ISelectionAcceptFormResponseItem extends IAcceptResponseItem {
    options: string[];
}

@type("SelectionAcceptFormResponseItem")
export class SelectionAcceptFormResponseItem extends AcceptResponseItem implements ISelectionAcceptFormResponseItem {
    @serialize()
    @validate()
    public options: string[];

    public static override from(
        value: ISelectionAcceptFormResponseItem | Omit<SelectionAcceptFormResponseItemJSON, "@type"> | SelectionAcceptFormResponseItemJSON
    ): SelectionAcceptFormResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionAcceptFormResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionAcceptFormResponseItemJSON;
    }
}
