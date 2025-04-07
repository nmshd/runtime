import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface FreeValueFormRequestItemJSON extends RequestItemJSON {
    "@type": "FreeValueFormRequestItem";
    freeValueType: FreeValueFormFieldTypes | `${FreeValueFormFieldTypes}`;
}

export interface IFreeValueFormRequestItem extends IRequestItem {
    freeValueType: FreeValueFormFieldTypes;
}

export enum FreeValueFormFieldTypes {
    TextField = "TextField",
    NumberField = "NumberField",
    DateField = "DateField"
}

@type("FreeValueFormRequestItem")
export class FreeValueFormRequestItem extends RequestItem implements IFreeValueFormRequestItem {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(FreeValueFormFieldTypes).includes(v) ? `must be one of: ${Object.values(FreeValueFormFieldTypes).map((o) => `"${o}"`)}` : undefined)
    })
    public freeValueType: FreeValueFormFieldTypes;

    public static from(value: IFreeValueFormRequestItem | Omit<FreeValueFormRequestItemJSON, "@type"> | FreeValueFormRequestItemJSON): FreeValueFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueFormRequestItemJSON;
    }
}
