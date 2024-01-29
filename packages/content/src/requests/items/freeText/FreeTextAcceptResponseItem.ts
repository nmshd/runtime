import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface FreeTextAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FreeTextAcceptResponseItem";
    freeText: string;
}

export interface IFreeTextAcceptResponseItem extends IAcceptResponseItem {
    freeText: string;
}

@type("FreeTextAcceptResponseItem")
export class FreeTextAcceptResponseItem extends AcceptResponseItem implements IFreeTextAcceptResponseItem {
    @serialize()
    @validate()
    public freeText: string;

    public static override from(value: IFreeTextAcceptResponseItem | FreeTextAcceptResponseItemJSON): FreeTextAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeTextAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeTextAcceptResponseItemJSON;
    }
}
