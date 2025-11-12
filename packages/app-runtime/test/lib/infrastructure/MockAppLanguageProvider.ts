import { Result } from "@js-soft/ts-utils";
import { IAppLanguageProvider } from "@nmshd/app-runtime";
import { LanguageISO639 } from "@nmshd/core-types";

export class MockAppLanguageProvider implements IAppLanguageProvider {
    #appLanguage: LanguageISO639 = LanguageISO639.en;

    public set appLanguage(language: LanguageISO639) {
        this.#appLanguage = language;
    }

    public getAppLanguage(): Promise<Result<LanguageISO639>> {
        return Promise.resolve(Result.ok(this.#appLanguage));
    }
}
