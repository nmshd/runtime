import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";
import { IAppLanguageProvider } from "../../../src";

export class FakeAppLanguageProvider implements IAppLanguageProvider {
    public getAppLanguage(): Promise<Result<LanguageISO639>> {
        return Promise.resolve(Result.ok(LanguageISO639.en));
    }
}
