import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";
import { ILanguageProvider } from "../../src";

export class MockLanguageProvider implements ILanguageProvider {
    #language: LanguageISO639 = LanguageISO639.en;

    public set language(language: LanguageISO639) {
        this.#language = language;
    }

    public getAppLanguage(): Promise<Result<LanguageISO639>> {
        return Promise.resolve(Result.ok(this.#language));
    }
}
