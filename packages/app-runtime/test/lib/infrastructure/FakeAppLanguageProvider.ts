import { Result } from "@js-soft/ts-utils";
import { IAppLanguageProvider } from "@nmshd/app-runtime";
import { LanguageISO639 } from "@nmshd/core-types";

export class FakeAppLanguageProvider implements IAppLanguageProvider {
    public getAppLanguage(): Promise<Result<LanguageISO639>> {
        return Promise.resolve(Result.ok(LanguageISO639.en));
    }
}
