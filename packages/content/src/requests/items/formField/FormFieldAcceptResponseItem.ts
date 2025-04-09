import { PrimitiveType, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface FormFieldAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FormFieldAcceptResponseItem";
    response: string | number | boolean | string[];
}

export interface IFormFieldAcceptResponseItem extends IAcceptResponseItem {
    response: string | number | boolean | string[];
}

@type("FormFieldAcceptResponseItem")
export class FormFieldAcceptResponseItem extends AcceptResponseItem implements IFormFieldAcceptResponseItem {
    @serialize()
    @validate({ allowedTypes: [PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean, PrimitiveType.Array] })
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
