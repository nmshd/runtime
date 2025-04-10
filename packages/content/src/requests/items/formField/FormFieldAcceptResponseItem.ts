import { PrimitiveType, Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
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

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof FormFieldAcceptResponseItem)) {
            throw new Error("this should never happen");
        }

        if (value.response instanceof Array && !value.response.every((option) => typeof option === "string")) {
            throw new ValidationError(
                FormFieldAcceptResponseItem.name,
                nameof<FormFieldAcceptResponseItem>((x) => x.response),
                `If the ${nameof<FormFieldAcceptResponseItem>((x) => x.response)} is an array, it must be a string array.`
            );
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldAcceptResponseItemJSON;
    }
}
