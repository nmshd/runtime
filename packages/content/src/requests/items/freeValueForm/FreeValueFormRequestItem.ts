import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export enum FreeValueFormRequestItemTypes {
    String = "String",
    Number = "Number",
    Date = "Date"
}

export interface FreeValueFormRequestItemJSON extends RequestItemJSON {
    "@type": "FreeValueFormRequestItem";
    freeValueType: FreeValueFormRequestItemTypes;
}

export interface IFreeValueFormRequestItem extends IRequestItem {
    freeValueType: FreeValueFormRequestItemTypes;
}

@type("FreeValueFormRequestItem")
export class FreeValueFormRequestItem extends RequestItem implements IFreeValueFormRequestItem {
    @serialize()
    @validate()
    public freeValueType: FreeValueFormRequestItemTypes;

    @serialize()
    @validate()
    public static from(value: IFreeValueFormRequestItem | Omit<FreeValueFormRequestItemJSON, "@type"> | FreeValueFormRequestItemJSON): FreeValueFormRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueFormRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueFormRequestItemJSON;
    }
}
