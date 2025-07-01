import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";

export interface IAppLanguageProvider {
    getAppLanguage(): Promise<Result<LanguageISO639>>;
}
