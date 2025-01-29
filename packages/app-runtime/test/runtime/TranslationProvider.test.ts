import { Result } from "@js-soft/ts-utils";
import { AppRuntime, INativeTranslationProvider } from "../../src";
import { TestUtil } from "../lib";

describe("TranslationProvider", function () {
    let runtime: AppRuntime;

    const defaultErrorMessage = "This is a default error.";
    const noTranslationAvailable = "No translation available.";

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        class SpecificTranslationProvider implements INativeTranslationProvider {
            public translate(key: string, ..._values: any[]): Promise<Result<string>> {
                switch (key) {
                    case "error.default":
                        return Promise.resolve(Result.ok(defaultErrorMessage));
                    default:
                        return Promise.resolve(Result.ok(noTranslationAvailable));
                }
            }
        }

        runtime.registerTranslationProvider(new SpecificTranslationProvider());
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should translate 'error.default'", async function () {
        const translation = await runtime.translate("error.default");
        expect(translation).toBeInstanceOf(Result);
        expect(translation.isSuccess).toBe(true);
        expect(translation.value).toBe(defaultErrorMessage);
    });

    test("should translate 'test' to the default message", async function () {
        const translation = await runtime.translate("aKeyWithoutAvailableTranslation");
        expect(translation).toBeInstanceOf(Result);
        expect(translation.isSuccess).toBe(true);
        expect(translation.value).toBe(noTranslationAvailable);
    });
});
