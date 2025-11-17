import { Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { SettingScope } from "./Setting.js";

export interface ICreateSettingParameters {
    key: string;
    value: Serializable;
    reference?: CoreId;
    scope?: SettingScope;
    succeedsAt?: CoreDate;
    succeedsItem?: CoreId;
}
