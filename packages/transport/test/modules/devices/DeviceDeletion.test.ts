import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController } from "@nmshd/transport";
import { AppDeviceTest } from "../../testHelpers/AppDeviceTest.js";
import { DeviceTestParameters } from "../../testHelpers/DeviceTestParameters.js";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("Device Deletion", function () {
    let connection: IDatabaseConnection;

    let deviceTest: AppDeviceTest;

    let accountController: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();

        const parameters = new DeviceTestParameters({ ...TestUtil.createConfig(), datawalletEnabled: true }, connection, TestUtil.loggerFactory);
        deviceTest = new AppDeviceTest(parameters);

        await deviceTest.init();

        accountController = await deviceTest.createAccount();
    });

    afterEach(async function () {
        await accountController.syncDatawallet();
    });

    afterAll(async function () {
        await deviceTest.close();
        await connection.close();
    });

    test("should delete a newly created device", async function () {
        const newDevice = await accountController.devices.sendDevice({ name: "Test1", isAdmin: true });

        await accountController.devices.delete(newDevice);

        const devices = await accountController.devices.list();
        const deviceIds = devices.map((d) => d.id.toString());
        expect(deviceIds).not.toContain(newDevice.id.toString());
    });

    test("should not delete an already onboarded device rejected by Backbone", async function () {
        const newDevice = await accountController.devices.sendDevice({ name: "Test2", isAdmin: true });
        await accountController.syncDatawallet();
        await deviceTest.onboardDevice(await accountController.devices.getSharedSecret(newDevice.id));

        await expect(accountController.devices.delete(newDevice)).rejects.toThrow("Could not delete device: 'Backbone did not authorize deletion.'");

        const devices = await accountController.devices.list();
        const deviceIds = devices.map((d) => d.id.toString());
        expect(deviceIds).toContain(newDevice.id.toString());
    });

    test("should not delete an already onboarded device", async function () {
        const newDevice = await accountController.devices.sendDevice({ name: "Test3", isAdmin: true });
        await accountController.syncDatawallet();
        await deviceTest.onboardDevice(await accountController.devices.getSharedSecret(newDevice.id));
        await accountController.syncDatawallet();

        const deviceToDelete = await accountController.devices.get(newDevice.id);
        await expect(accountController.devices.delete(deviceToDelete!)).rejects.toThrow("Could not delete device: 'Device is already onboarded.'");

        const devices = await accountController.devices.list();
        const deviceIds = devices.map((d) => d.id.toString());
        expect(deviceIds).toContain(newDevice.id.toString());
    });
});
