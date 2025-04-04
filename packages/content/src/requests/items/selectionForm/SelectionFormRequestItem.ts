import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export enum SelectionFormRequestItemTypes {
    Radio = "Radio",
    Dropdown = "Dropdown",
    Checklist = "Checklist"
}

export interface SelectionFormRequestItemJSON extends RequestItemJSON {
    "@type": "SelectionFormRequestItem";
    selectionType: SelectionFormRequestItemTypes;
    options: string[];
}

export interface ISelectionFormRequestItem extends IRequestItem {
    selectionType: SelectionFormRequestItemTypes;
    options: string[];
}

@type("SelectionFormRequestItem")
export class SelectionFormRequestItem extends RequestItem implements ISelectionFormRequestItem {
    @serialize()
    @validate()
    public selectionType: SelectionFormRequestItemTypes;

    @serialize()
    @validate()
    public options: string[];

    public static from(value: ISelectionFormRequestItem | Omit<SelectionFormRequestItemJSON, "@type"> | SelectionFormRequestItemJSON): SelectionFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormRequestItemJSON;
    }
}
