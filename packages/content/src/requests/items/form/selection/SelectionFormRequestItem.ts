import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../../RequestItem";
import { ValuesOfSelectionFormRequestItemJSON } from "../ValuesOfSelectionFormRequestItem";

enum SelectionFormRequestItemTypes {
    Radio = "radio",
    Dropdown = "dropdown",
    Checklist = "checklist"
}

interface DependentSelectionFormRequestItemOptionJSON {
    option: string;
    dependsOn: ValuesOfSelectionFormRequestItemJSON;
}

export interface SelectionFormRequestItemJSON extends RequestItemJSON {
    "@type": "SelectionFormRequestItem";
    selectionType: SelectionFormRequestItemTypes;
    options: (string | DependentSelectionFormRequestItemOptionJSON)[];
    itemId?: string;
    dependsOn?: ValuesOfSelectionFormRequestItemJSON;
}

export interface ISelectionFormRequestItem extends IRequestItem {
    selectionType: SelectionFormRequestItemTypes;
    options: (string | DependentSelectionFormRequestItemOptionJSON)[];
    itemId?: string;
    dependsOn?: ValuesOfSelectionFormRequestItemJSON;
}

@type("SelectionFormRequestItem")
export class SelectionFormRequestItem extends RequestItem implements ISelectionFormRequestItem {
    @serialize()
    @validate()
    public selectionType: SelectionFormRequestItemTypes;

    @serialize()
    @validate()
    public options: (string | DependentSelectionFormRequestItemOptionJSON)[];

    @serialize()
    @validate()
    public itemId?: "string";

    @serialize()
    @validate()
    public dependsOn?: ValuesOfSelectionFormRequestItemJSON;

    public static from(value: ISelectionFormRequestItem | Omit<SelectionFormRequestItemJSON, "@type"> | SelectionFormRequestItemJSON): SelectionFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectionFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectionFormRequestItemJSON;
    }
}
