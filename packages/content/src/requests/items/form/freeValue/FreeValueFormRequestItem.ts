import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../../RequestItem";
import { ValuesOfSelectionFormRequestItemJSON } from "../ValuesOfSelectionFormRequestItem";

enum FreeValueFormRequestItemTypes {
    String = "string",
    Number = "number",
    Date = "date"
}

export interface FreeValueFormRequestItemJSON extends RequestItemJSON {
    "@type": "FreeValueFormRequestItem";
    valueType: FreeValueFormRequestItemTypes;
    dependsOn?: ValuesOfSelectionFormRequestItemJSON;
}

export interface IFreeValueFormRequestItem extends IRequestItem {
    valueType: FreeValueFormRequestItemTypes;
    dependsOn?: ValuesOfSelectionFormRequestItemJSON;
}

@type("FreeValueFormRequestItem")
export class FreeValueFormRequestItem extends RequestItem implements IFreeValueFormRequestItem {
    @serialize()
    @validate()
    public valueType: FreeValueFormRequestItemTypes;

    @serialize()
    @validate()
    public dependsOn?: ValuesOfSelectionFormRequestItemJSON;

    public static from(value: IFreeValueFormRequestItem | Omit<FreeValueFormRequestItemJSON, "@type"> | FreeValueFormRequestItemJSON): FreeValueFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueFormRequestItemJSON;
    }
}
