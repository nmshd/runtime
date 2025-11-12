import { PrimitiveType, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response/index.js";

export interface FormFieldAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FormFieldAcceptResponseItem";
    response: string | number | boolean | string[];
}

export interface IFormFieldAcceptResponseItem extends IAcceptResponseItem {
    response: string | number | boolean | string[];
}

@type("FormFieldAcceptResponseItem")
export class FormFieldAcceptResponseItem extends AcceptResponseItem implements IFormFieldAcceptResponseItem {
    @serialize({ any: true })
    @validate({
        allowedTypes: [PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean, PrimitiveType.Array],
        customValidator: (v) =>
            typeof v === "string" && (v.length < 1 || v.length > 4096)
                ? "The string response cannot be shorter than 1 character or longer than 4096 characters."
                : Array.isArray(v) && !v.every((option) => typeof option === "string")
                  ? "If the response is an array, it must be a string array."
                  : undefined
    })
    public response: string | number | boolean | string[];

    public static override from(
        value: IFormFieldAcceptResponseItem | Omit<FormFieldAcceptResponseItemJSON, "@type"> | FormFieldAcceptResponseItemJSON
    ): FormFieldAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldAcceptResponseItemJSON;
    }
}
