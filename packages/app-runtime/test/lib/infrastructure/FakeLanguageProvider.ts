import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";
import { ILanguageProvider } from "../../../src";

export class FakeLanguageProvider implements ILanguageProvider {
    public getAppLanguage(): Promise<Result<LanguageISO639>> {
        return Promise.resolve(Result.ok(LanguageISO639.en));
    }
}
