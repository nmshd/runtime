import { BooleanFormFieldSettings, BooleanFormFieldSettingsJSON, IBooleanFormFieldSettings } from "./BooleanFormFieldSettings";
import { DateFormFieldSettings, DateFormFieldSettingsJSON, IDateFormFieldSettings } from "./DateFormFieldSettings";
import { DoubleFormFieldSettings, DoubleFormFieldSettingsJSON, IDoubleFormFieldSettings } from "./DoubleFormFieldSettings";
import { IIntegerFormFieldSettings, IntegerFormFieldSettings, IntegerFormFieldSettingsJSON } from "./IntegerFormFieldSettings";
import { IRatingFormFieldSettings, RatingFormFieldSettings, RatingFormFieldSettingsJSON } from "./RatingFormFieldSettings";
import { ISelectionFormFieldSettings, SelectionFormFieldSettings, SelectionFormFieldSettingsJSON } from "./SelectionFormFieldSettings";
import { IStringFormFieldSettings, StringFormFieldSettings, StringFormFieldSettingsJSON } from "./StringFormFieldSettings";

export type FormFieldSettingsJSONDerivations =
    | StringFormFieldSettingsJSON
    | IntegerFormFieldSettingsJSON
    | DoubleFormFieldSettingsJSON
    | BooleanFormFieldSettingsJSON
    | DateFormFieldSettingsJSON
    | SelectionFormFieldSettingsJSON
    | RatingFormFieldSettingsJSON;

export type IFormFieldSettingsDerivations =
    | IStringFormFieldSettings
    | IIntegerFormFieldSettings
    | IDoubleFormFieldSettings
    | IBooleanFormFieldSettings
    | IDateFormFieldSettings
    | ISelectionFormFieldSettings
    | IRatingFormFieldSettings;

export type FormFieldSettingsDerivations =
    | StringFormFieldSettings
    | IntegerFormFieldSettings
    | DoubleFormFieldSettings
    | BooleanFormFieldSettings
    | DateFormFieldSettings
    | SelectionFormFieldSettings
    | RatingFormFieldSettings;

export const FORM_FIELD_SETTINGS_CLASSES = [
    BooleanFormFieldSettings,
    DateFormFieldSettings,
    DoubleFormFieldSettings,
    IntegerFormFieldSettings,
    RatingFormFieldSettings,
    SelectionFormFieldSettings,
    StringFormFieldSettings
];
