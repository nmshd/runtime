import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface FreeValueFormAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FreeValueFormAcceptResponseItem";
    freeValue: string;
}

export interface IFreeValueFormAcceptResponseItem extends IAcceptResponseItem {
    freeValue: string;
}

@type("FreeValueFormAcceptResponseItem")
export class FreeValueFormAcceptResponseItem extends AcceptResponseItem implements IFreeValueFormAcceptResponseItem {
    @serialize()
    @validate()
    public freeValue: string;

    public static override from(
        value: IFreeValueFormAcceptResponseItem | Omit<FreeValueFormAcceptResponseItemJSON, "@type"> | FreeValueFormAcceptResponseItemJSON
    ): FreeValueFormAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FreeValueFormAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FreeValueFormAcceptResponseItemJSON;
    }
}
