import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem.js";
import { FORM_FIELD_SETTINGS_CLASSES, FormFieldSettingsDerivations, FormFieldSettingsJSONDerivations } from "./settings/index.js";

export interface FormFieldRequestItemJSON extends RequestItemJSON {
    "@type": "FormFieldRequestItem";
    title: string;
    settings: FormFieldSettingsJSONDerivations;
}

export interface IFormFieldRequestItem extends IRequestItem {
    title: string;
    settings: FormFieldSettingsDerivations;
}

@type("FormFieldRequestItem")
export class FormFieldRequestItem extends RequestItem implements IFormFieldRequestItem {
    @serialize()
    @validate({ max: 200 })
    public title: string;

    @serialize({ unionTypes: FORM_FIELD_SETTINGS_CLASSES })
    @validate()
    public settings: FormFieldSettingsDerivations;

    public static from(value: IFormFieldRequestItem | FormFieldRequestItemJSON | Omit<FormFieldRequestItemJSON, "@type">): FormFieldRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldRequestItemJSON;
    }
}
