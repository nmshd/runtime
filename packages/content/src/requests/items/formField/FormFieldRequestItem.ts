import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";

import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";
import { FormFieldSettingsDerivations, FormFieldSettingsJSONDerivations, IFormFieldSettingsDerivations } from "./FormFieldSettings";

export interface FormFieldRequestItemJSON extends RequestItemJSON {
    "@type": "FormFieldRequestItem";
    title: string;
    settings: FormFieldSettingsJSONDerivations;
}

export interface IFormFieldRequestItem extends IRequestItem {
    title: string;
    settings: IFormFieldSettingsDerivations;
}

@type("FormFieldRequestItem")
export class FormFieldRequestItem extends RequestItem implements IFormFieldRequestItem {
    @serialize()
    @validate()
    public override title: string;

    @serialize()
    @validate()
    public settings: FormFieldSettingsDerivations;

    public static from(value: IFormFieldRequestItem | Omit<FormFieldRequestItemJSON, "@type"> | FormFieldRequestItemJSON): FormFieldRequestItem {
        return this.fromAny(value);
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof FormFieldRequestItem)) {
            throw new Error("this should never happen");
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldRequestItemJSON;
    }
}
