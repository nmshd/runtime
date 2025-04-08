import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";

import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";
import { FreeValueFormField, FreeValueFormFieldJSON, IFreeValueFormField } from "./FreeValueFormField";
import { ISelectionFormField, SelectionFormField, SelectionFormFieldJSON } from "./SelectionFormField";

export interface FormFieldRequestItemJSON extends RequestItemJSON {
    "@type": "FormFieldRequestItem";
    title: string;
    freeValueFormField?: FreeValueFormFieldJSON;
    selectionFormField?: SelectionFormFieldJSON;
}

export interface IFormFieldRequestItem extends IRequestItem {
    title: string;
    freeValueFormField?: IFreeValueFormField;
    selectionFormField?: ISelectionFormField;
}

@type("FormFieldRequestItem")
export class FormFieldRequestItem extends RequestItem implements IFormFieldRequestItem {
    @serialize()
    @validate()
    public override title: string;

    @serialize()
    @validate({ nullable: true })
    public freeValueFormField: FreeValueFormField;

    @serialize()
    @validate({ nullable: true })
    public selectionFormField: SelectionFormField;

    public static from(value: IFormFieldRequestItem | Omit<FormFieldRequestItemJSON, "@type"> | FormFieldRequestItemJSON): FormFieldRequestItem {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof FormFieldRequestItem)) {
            throw new Error("this should never happen");
        }

        if (value.freeValueFormField instanceof FreeValueFormField && value.selectionFormField instanceof SelectionFormField) {
            throw new ValidationError(
                FormFieldRequestItem.name,
                nameof<FormFieldRequestItem>((x) => x.freeValueFormField),
                `You cannot specify both ${nameof<FormFieldRequestItem>((x) => x.freeValueFormField)} and ${nameof<FormFieldRequestItem>((x) => x.selectionFormField)}.`
            );
        }

        if (!(value.freeValueFormField instanceof FreeValueFormField) && !(value.selectionFormField instanceof FreeValueFormField)) {
            throw new ValidationError(
                FormFieldRequestItem.name,
                nameof<FormFieldRequestItem>((x) => x.freeValueFormField),
                `You have to specify either ${nameof<FormFieldRequestItem>((x) => x.freeValueFormField)} or ${nameof<FormFieldRequestItem>((x) => x.selectionFormField)}.`
            );
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldRequestItemJSON;
    }
}
