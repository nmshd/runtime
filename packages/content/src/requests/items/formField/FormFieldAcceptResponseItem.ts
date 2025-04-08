import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface FormFieldAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "FormFieldAcceptResponseItem";
    freeValue?: string;
    options?: string[];
}

export interface IFormFieldAcceptResponseItem extends IAcceptResponseItem {
    freeValue?: string;
    options?: string[];
}

@type("FormFieldAcceptResponseItem")
export class FormFieldAcceptResponseItem extends AcceptResponseItem implements IFormFieldAcceptResponseItem {
    @serialize()
    @validate({ nullable: true })
    public freeValue: string;

    @serialize()
    @validate({ nullable: true })
    public options: string[];

    public static override from(
        value: IFormFieldAcceptResponseItem | Omit<FormFieldAcceptResponseItemJSON, "@type"> | FormFieldAcceptResponseItemJSON
    ): FormFieldAcceptResponseItem {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof FormFieldAcceptResponseItem)) {
            throw new Error("this should never happen");
        }

        if (value.freeValue && Array.isArray(value.options)) {
            throw new ValidationError(
                FormFieldAcceptResponseItem.name,
                nameof<FormFieldAcceptResponseItem>((x) => x.freeValue),
                `You cannot specify both ${nameof<FormFieldAcceptResponseItem>((x) => x.freeValue)} and ${nameof<FormFieldAcceptResponseItem>((x) => x.options)}.`
            );
        }

        if (!value.freeValue && !Array.isArray(value.options)) {
            throw new ValidationError(
                FormFieldAcceptResponseItem.name,
                nameof<FormFieldAcceptResponseItem>((x) => x.freeValue),
                `You have to specify either ${nameof<FormFieldAcceptResponseItem>((x) => x.freeValue)} or ${nameof<FormFieldAcceptResponseItem>((x) => x.options)}.`
            );
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldAcceptResponseItemJSON;
    }
}
