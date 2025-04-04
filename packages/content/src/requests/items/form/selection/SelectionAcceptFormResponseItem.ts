import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../../response";

export interface SelectAcceptFormResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "SelectAcceptFormResponseItem";
    options: string[];
}

export interface ISelectAcceptFormResponseItem extends IAcceptResponseItem {
    options: string[];
}

@type("SelectAcceptFormResponseItem")
export class SelectAcceptFormResponseItem extends AcceptResponseItem implements ISelectAcceptFormResponseItem {
    @serialize()
    @validate()
    public options: string[];

    public static override from(
        value: ISelectAcceptFormResponseItem | Omit<SelectAcceptFormResponseItemJSON, "@type"> | SelectAcceptFormResponseItemJSON
    ): SelectAcceptFormResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): SelectAcceptFormResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as SelectAcceptFormResponseItemJSON;
    }
}
