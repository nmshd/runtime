import { AppRuntime, AppRuntimeServices, LocalAccountDTO } from "../../src";
import { TestUtil } from "../lib";

describe("Offboarding", function () {
    let runtime: AppRuntime;

    let localAccount2: LocalAccountDTO;

    let services1: AppRuntimeServices;

    let device2Id: string;

    beforeAll(async function () {
        // as we can't pop up multiple runtimes we have to allow multiple accounts with
        // the same address to test offboarding
        const configOverride = { allowMultipleAccountsWithSameAddress: true };
        runtime = await TestUtil.createRuntime(configOverride);
        await runtime.start();

        const [localAccount1] = await TestUtil.provideAccounts(runtime, 1);
        services1 = await runtime.getServices(localAccount1.id);

        const createDeviceResult = await services1.transportServices.devices.createDevice({});
        device2Id = createDeviceResult.value.id;

        const onboardingInfoResult = await services1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id });

        localAccount2 = await runtime.accountServices.onboardAccount(onboardingInfoResult.value);
        const services2 = await runtime.getServices(localAccount2.id);

        await services2.transportServices.account.syncDatawallet();
        await services1.transportServices.account.syncDatawallet();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should have 2 accounts", async function () {
        const accounts = await runtime.accountServices.getAccounts();

        expect(accounts).toHaveLength(2);
    });

    // validate that the account is deleted, test is valid if no error is thrown
    // eslint-disable-next-line jest/expect-expect
    test("delete account 2", async function () {
        await runtime.accountServices.deleteAccount(localAccount2.id);
    });

    test("should have 1 account", async function () {
        const accounts = await runtime.accountServices.getAccounts();

        expect(accounts).toHaveLength(1);
    });

    test("device should be flagged as offboarded in the list of devices", async function () {
        await services1.transportServices.account.syncDatawallet();

        const devices = await services1.transportServices.devices.getDevices();
        const device = devices.value.find((d) => d.id === device2Id);

        expect(device).toBeDefined();
        expect(device!.isOffboarded).toBe(true);
    });

    test("device should be flagged as offboarded when querying the device", async function () {
        const deviceResult = await services1.transportServices.devices.getDevice({ id: device2Id });
        const device = deviceResult.value;

        expect(device).toBeDefined();
        expect(device.isOffboarded).toBe(true);
    });
});
