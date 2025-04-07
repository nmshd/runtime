import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface SelectionFormRequestItemJSON extends RequestItemJSON {
    "@type": "SelectionFormRequestItem";
    selectionType: SelectionFormFieldTypes | `${SelectionFormFieldTypes}`;
    options: string[];
}

export interface ISelectionFormRequestItem extends IRequestItem {
    selectionType: SelectionFormFieldTypes;
    options: string[];
}

export enum SelectionFormFieldTypes {
    RadioButtonGroup = "RadioButtonGroup",
    DropdownMenu = "DropdownMenu",
    Checklist = "Checklist"
}
@type("SelectionFormRequestItem")
export class SelectionFormRequestItem extends RequestItem implements ISelectionFormRequestItem {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(SelectionFormFieldTypes).includes(v) ? `must be one of: ${Object.values(SelectionFormFieldTypes).map((o) => `"${o}"`)}` : undefined)
    })
    public selectionType: SelectionFormFieldTypes;

    @serialize({ type: String })
    @validate()
    public options: string[];

    public static from(value: ISelectionFormRequestItem | Omit<SelectionFormRequestItemJSON, "@type"> | SelectionFormRequestItemJSON): SelectionFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormRequestItemJSON;
    }
}
