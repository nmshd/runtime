import { BooleanFormFieldSettings, BooleanFormFieldSettingsJSON } from "./BooleanFormFieldSettings.js";
import { DateFormFieldSettings, DateFormFieldSettingsJSON } from "./DateFormFieldSettings.js";
import { DoubleFormFieldSettings, DoubleFormFieldSettingsJSON } from "./DoubleFormFieldSettings.js";
import { IntegerFormFieldSettings, IntegerFormFieldSettingsJSON } from "./IntegerFormFieldSettings.js";
import { RatingFormFieldSettings, RatingFormFieldSettingsJSON } from "./RatingFormFieldSettings.js";
import { SelectionFormFieldSettings, SelectionFormFieldSettingsJSON } from "./SelectionFormFieldSettings.js";
import { StringFormFieldSettings, StringFormFieldSettingsJSON } from "./StringFormFieldSettings.js";

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
