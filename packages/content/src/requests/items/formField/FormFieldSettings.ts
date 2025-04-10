import { ISerializable, Serializable } from "@js-soft/ts-serval";
import {
    ISelectionFormFieldSettings,
    IStringFormFieldSettings,
    SelectionFormFieldSettings,
    SelectionFormFieldSettingsJSON,
    StringFormFieldSettings,
    StringFormFieldSettingsJSON
} from "../..";
import { ContentJSON } from "../../../ContentJSON";
import { BooleanFormFieldSettings, BooleanFormFieldSettingsJSON, IBooleanFormFieldSettings } from "./settings/BooleanFormFieldSettings";
import { DateFormFieldSettings, DateFormFieldSettingsJSON, IDateFormFieldSettings } from "./settings/DateFormFieldSettings";
import { DoubleFormFieldSettings, DoubleFormFieldSettingsJSON, IDoubleFormFieldSettings } from "./settings/DoubleFormFieldSettings";
import { IIntegerFormFieldSettings, IntegerFormFieldSettings, IntegerFormFieldSettingsJSON } from "./settings/IntegerFormFieldSettings";
import { IRatingFormFieldSettings, RatingFormFieldSettings, RatingFormFieldSettingsJSON } from "./settings/RatingFormFieldSettings";

export interface FormFieldSettingsJSON extends ContentJSON {}

export type FormFieldSettingsJSONDerivations =
    | StringFormFieldSettingsJSON
    | IntegerFormFieldSettingsJSON
    | DoubleFormFieldSettingsJSON
    | BooleanFormFieldSettingsJSON
    | DateFormFieldSettingsJSON
    | SelectionFormFieldSettingsJSON
    | RatingFormFieldSettingsJSON;

export interface IFormFieldSettings extends ISerializable {}

export type IFormFieldSettingsDerivations =
    | IStringFormFieldSettings
    | IIntegerFormFieldSettings
    | IDoubleFormFieldSettings
    | IBooleanFormFieldSettings
    | IDateFormFieldSettings
    | ISelectionFormFieldSettings
    | IRatingFormFieldSettings;

export abstract class FormFieldSettings extends Serializable {
    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): FormFieldSettingsJSON {
        return super.toJSON(verbose, serializeAsString) as FormFieldSettingsJSON;
    }
}

export type FormFieldSettingsDerivations =
    | StringFormFieldSettings
    | IntegerFormFieldSettings
    | DoubleFormFieldSettings
    | BooleanFormFieldSettings
    | DateFormFieldSettings
    | SelectionFormFieldSettings
    | RatingFormFieldSettings;
