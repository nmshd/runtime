import { AppRuntime } from "../../src";
import { TestUtil } from "../lib";

describe("AppStringProcessor", function () {
    let runtime: AppRuntime;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should process a URL", async function () {
        const account = await runtime.accountServices.createAccount(Math.random().toString(36).substring(7));

        const result = await runtime.stringProcessor.processURL("nmshd://qr#", account);
        expect(result.isError).toBeDefined();

        expect(result.error.code).toBe("error.appStringProcessor.truncatedReferenceInvalid");
    });
});
