import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";
import { FORM_FIELD_SETTINGS_CLASSES, FormFieldSettingsDerivations, FormFieldSettingsJSONDerivations, IFormFieldSettingsDerivations } from "./settings";

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

    @serialize({ unionTypes: FORM_FIELD_SETTINGS_CLASSES })
    @validate()
    public settings: FormFieldSettingsDerivations;

    public static from(value: FormFieldRequestItemJSON | Omit<FormFieldRequestItemJSON, "@type">): FormFieldRequestItem {
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
