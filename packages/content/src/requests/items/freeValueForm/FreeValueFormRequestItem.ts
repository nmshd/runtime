import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface FreeValueFormRequestItemJSON extends RequestItemJSON {
    "@type": "FreeValueFormRequestItem";
    freeValueFieldType: FreeValueFieldTypes | `${FreeValueFieldTypes}`;
}

export interface IFreeValueFormRequestItem extends IRequestItem {
    freeValueFieldType: FreeValueFieldTypes;
}

export enum FreeValueFieldTypes {
    TextField = "TextField",
    TextAreaField = "TextAreaField",
    NumberField = "NumberField",
    DateField = "DateField"
}

@type("FreeValueFormRequestItem")
export class FreeValueFormRequestItem extends RequestItem implements IFreeValueFormRequestItem {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(FreeValueFieldTypes).includes(v) ? `must be one of: ${Object.values(FreeValueFieldTypes).map((o) => `"${o}"`)}` : undefined)
    })
    public freeValueFieldType: FreeValueFieldTypes;

    public static from(value: IFreeValueFormRequestItem | Omit<FreeValueFormRequestItemJSON, "@type"> | FreeValueFormRequestItemJSON): FreeValueFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueFormRequestItemJSON;
    }
}
