import { AppRuntime, LocalAccountDTO } from "@nmshd/app-runtime";
import { TestUtil } from "../lib/index.js";

describe("Test setting the account name", function () {
    let runtime: AppRuntime;
    let localAccount: LocalAccountDTO;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts: LocalAccountDTO[] = await TestUtil.provideAccounts(runtime, 1);
        localAccount = accounts[0];
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should set the account name", async function () {
        const accountName = "anAccountName";

        expect(localAccount).toBeDefined();

        await runtime.accountServices.renameAccount(localAccount.id, accountName);

        const accounts = await runtime.accountServices.getAccounts();
        const account = accounts.find((acc) => acc.id.toString() === localAccount.id.toString())!;

        expect(account.name).toBe(accountName);
    });
});
