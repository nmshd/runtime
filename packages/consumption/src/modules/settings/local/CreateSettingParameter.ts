import { Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/transport";
import { SettingScope } from "./Setting";

export interface ICreateSettingParameters {
    key: string;
    value: Serializable;
    reference?: CoreId;
    scope?: SettingScope;
    succeedsAt?: CoreDate;
    succeedsItem?: CoreId;
}
