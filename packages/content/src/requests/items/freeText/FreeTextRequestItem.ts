import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface FreeTextRequestItemJSON extends RequestItemJSON {
    "@type": "FreeTextRequestItem";
    freeText: string;
}

export interface IFreeTextRequestItem extends IRequestItem {
    freeText: string;
}

@type("FreeTextRequestItem")
export class FreeTextRequestItem extends RequestItem implements IFreeTextRequestItem {
    @serialize()
    @validate()
    public freeText: string;

    public static from(value: IFreeTextRequestItem | Omit<FreeTextRequestItemJSON, "@type">): FreeTextRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeTextRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeTextRequestItemJSON;
    }
}
