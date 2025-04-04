import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface FreeValueAcceptFormResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FreeValueAcceptFormResponseItem";
    freeValue: string | number | Date;
}

export interface IFreeValueAcceptFormResponseItem extends IAcceptResponseItem {
    freeValue: string | number | Date;
}

@type("FreeValueAcceptFormResponseItem")
export class FreeValueAcceptFormResponseItem extends AcceptResponseItem implements IFreeValueAcceptFormResponseItem {
    @serialize()
    @validate()
    public freeValue: string | number | Date;

    public static override from(
        value: IFreeValueAcceptFormResponseItem | Omit<FreeValueAcceptFormResponseItemJSON, "@type"> | FreeValueAcceptFormResponseItemJSON
    ): FreeValueAcceptFormResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueAcceptFormResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueAcceptFormResponseItemJSON;
    }
}
