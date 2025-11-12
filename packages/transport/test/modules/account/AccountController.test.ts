import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("AccountController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let account: AccountController | undefined;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        account = accounts[0];
    });

    afterAll(async function () {
        await account?.close();

        await connection.close();
    });

    test("should init a second time", async function () {
        const promise = account!.init();
        await expect(promise).resolves.not.toThrow();
    });
});
