import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController } from "../../../src";
import { AppDeviceTest } from "../../testHelpers/AppDeviceTest";
import { DeviceTestParameters } from "../../testHelpers/DeviceTestParameters";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("set the communication language", function () {
    let connection: IDatabaseConnection;

    let deviceTest: AppDeviceTest;

    let device1Account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();

        const parameters = new DeviceTestParameters({ ...TestUtil.createConfig(), datawalletEnabled: true }, connection, TestUtil.loggerFactory);
        deviceTest = new AppDeviceTest(parameters);

        await deviceTest.init();

        device1Account = await deviceTest.createAccount();
    });

    afterAll(async function () {
        await deviceTest.close();

        await connection.close();
    });

    test("should set the communication language", async function () {
        await expect(device1Account.activeDevice.setCommunicationLanguage("fr")).resolves.not.toThrow();
    });
});
