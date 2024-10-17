import { mock } from "ts-mockito";
import { AppRuntime, IUIBridge, LocalAccountDTO, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("AppStringProcessor", function () {
    let mockUiBridge: IUIBridge;
    let runtime1: AppRuntime;
    let account: LocalAccountDTO;
    let runtime1Session: LocalAccountSession;

    let runtime2: AppRuntime;

    let runtime2SessionA: LocalAccountSession;
    let runtime2SessionB: LocalAccountSession;

    beforeAll(async function () {
        runtime1 = await TestUtil.createRuntime();
        await runtime1.start();

        account = await runtime1.accountServices.createAccount(Math.random().toString(36).substring(7));
        runtime1Session = await runtime1.selectAccount(account.id);

        mockUiBridge = mock<IUIBridge>();
        runtime2 = await TestUtil.createRuntime(undefined, mockUiBridge);
        await runtime2.start();

        const accounts = await TestUtil.provideAccounts(runtime2, 2);
        runtime2SessionA = await runtime2.selectAccount(accounts[0].id);
        runtime2SessionB = await runtime2.selectAccount(accounts[1].id);
    });

    afterAll(async function () {
        await runtime1.stop();
        await runtime2.stop();
    });

    test("should process a URL", async function () {
        const result = await runtime1.stringProcessor.processURL("nmshd://qr#", account);
        expect(result.isError).toBeDefined();

        expect(result.error.code).toBe("error.appStringProcessor.truncatedReferenceInvalid");
    });
});
