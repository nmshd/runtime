import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Transport } from "../../src";
import { TestUtil } from "../testHelpers/TestUtil";

describe("TimeSyncTest", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let recipient: AccountController;

    let localTime: CoreDate;
    let serverTime: CoreDate;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        localTime = CoreDate.utc();
        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        recipient = accounts[0];
        serverTime = recipient.activeDevice.createdAt;
    });

    afterAll(async function () {
        await recipient.close();
        await connection.close();
    });

    test("local Testrunner's time should be in sync with Backbone", function () {
        expect(localTime.isWithin(TestUtil.tempDateThreshold, TestUtil.tempDateThreshold, serverTime)).toBe(true);
    });
});
