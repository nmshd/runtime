import {
    ISelectionFormFieldSettings,
    IStringFormFieldSettings,
    SelectionFormFieldSettings,
    SelectionFormFieldSettingsJSON,
    StringFormFieldSettings,
    StringFormFieldSettingsJSON
} from "../..";
import { BooleanFormFieldSettings, BooleanFormFieldSettingsJSON, IBooleanFormFieldSettings } from "./settings/BooleanFormFieldSettings";
import { DateFormFieldSettings, DateFormFieldSettingsJSON, IDateFormFieldSettings } from "./settings/DateFormFieldSettings";
import { DoubleFormFieldSettings, DoubleFormFieldSettingsJSON, IDoubleFormFieldSettings } from "./settings/DoubleFormFieldSettings";
import { IIntegerFormFieldSettings, IntegerFormFieldSettings, IntegerFormFieldSettingsJSON } from "./settings/IntegerFormFieldSettings";
import { IRatingFormFieldSettings, RatingFormFieldSettings, RatingFormFieldSettingsJSON } from "./settings/RatingFormFieldSettings";

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
