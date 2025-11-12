import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController } from "@nmshd/transport";
import { AppDeviceTest } from "../../testHelpers/AppDeviceTest";
import { DeviceTestParameters } from "../../testHelpers/DeviceTestParameters";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("set the communication language", function () {
    let connection: IDatabaseConnection;

    let deviceTest: AppDeviceTest;

    let deviceAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();

        const parameters = new DeviceTestParameters({ ...TestUtil.createConfig(), datawalletEnabled: true }, connection, TestUtil.loggerFactory);
        deviceTest = new AppDeviceTest(parameters);

        await deviceTest.init();

        deviceAccount = await deviceTest.createAccount();
    });

    afterAll(async function () {
        await deviceTest.close();

        await connection.close();
    });

    test("should set the communication language", async function () {
        await expect(deviceAccount.activeDevice.setCommunicationLanguage("fr")).resolves.not.toThrow();
    });

    test("should not set a false communication language", async function () {
        await expect(deviceAccount.activeDevice.setCommunicationLanguage("fra")).rejects.toThrow("error.platform.validation.invalidDeviceCommunicationLanguage (400)");
    });
});
