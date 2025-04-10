import { BooleanFormFieldSettings, BooleanFormFieldSettingsJSON } from "./BooleanFormFieldSettings";
import { DateFormFieldSettings, DateFormFieldSettingsJSON } from "./DateFormFieldSettings";
import { DoubleFormFieldSettings, DoubleFormFieldSettingsJSON } from "./DoubleFormFieldSettings";
import { IntegerFormFieldSettings, IntegerFormFieldSettingsJSON } from "./IntegerFormFieldSettings";
import { RatingFormFieldSettings, RatingFormFieldSettingsJSON } from "./RatingFormFieldSettings";
import { SelectionFormFieldSettings, SelectionFormFieldSettingsJSON } from "./SelectionFormFieldSettings";
import { StringFormFieldSettings, StringFormFieldSettingsJSON } from "./StringFormFieldSettings";

export type FormFieldSettingsJSONDerivations =
    | StringFormFieldSettingsJSON
    | IntegerFormFieldSettingsJSON
    | DoubleFormFieldSettingsJSON
    | BooleanFormFieldSettingsJSON
    | DateFormFieldSettingsJSON
    | SelectionFormFieldSettingsJSON
    | RatingFormFieldSettingsJSON;

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
