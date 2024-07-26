import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("AccountController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let account: AccountController | undefined;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
    });

    afterAll(async function () {
        await account?.close();

        await connection.close();
    });

    // eslint-disable-next-line jest/expect-expect
    test("should init a second time", async function () {
        await account!.init();
    });

    test("should correctly check a valid backbone version", async function () {
        const transport = TestUtil.createTransport(connection, { supportedMinBackboneVersion: 1, supportedMaxBackboneVersion: 50 });
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];

        const versionCheckResult = await account.validateUsedBackboneVersion();
        expect(versionCheckResult.isSuccess).toBe(true);
    });

    test("should catch a too low backbone version", async function () {
        const transport = TestUtil.createTransport(connection, { supportedMinBackboneVersion: 51, supportedMaxBackboneVersion: 60 });
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];

        const versionCheckResult = await account.validateUsedBackboneVersion();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });

    test("should catch a too high backbone version", async function () {
        const transport = TestUtil.createTransport(connection, { supportedMinBackboneVersion: 1, supportedMaxBackboneVersion: 2 });
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];

        const versionCheckResult = await account.validateUsedBackboneVersion();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });
});
