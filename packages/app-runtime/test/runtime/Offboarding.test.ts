import { AppRuntime, AppRuntimeServices } from "../../src";
import { TestUtil } from "../lib";

describe("Offboarding", function () {
    let runtime: AppRuntime;

    let services1: AppRuntimeServices;
    let localAccount2Id: string;
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

        const localAccount2 = await runtime.accountServices.onboardAccount(onboardingInfoResult.value);
        localAccount2Id = localAccount2.id;
        const services2 = await runtime.getServices(localAccount2.id);

        await services2.transportServices.account.syncDatawallet();
        await services1.transportServices.account.syncDatawallet();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("delete account", async function () {
        await runtime.accountServices.deleteAccount(localAccount2Id);
        await services1.transportServices.account.syncDatawallet();

        const accounts = await runtime.accountServices.getAccounts();
        expect(accounts).toHaveLength(1);

        const devicesResult = await services1.transportServices.devices.getDevices();
        const filteredDevice = devicesResult.value.find((d) => d.id === device2Id);

        expect(filteredDevice).toBeDefined();
        expect(filteredDevice!.isOffboarded).toBe(true);

        const deviceResult = await services1.transportServices.devices.getDevice({ id: device2Id });
        const device = deviceResult.value;

        expect(device.isOffboarded).toBe(true);

        await expect(runtime.getServices(localAccount2Id)).rejects.toThrow("error.transport.recordNotFound");
        await expect(runtime.selectAccount(localAccount2Id)).rejects.toThrow("error.transport.recordNotFound");
    });
});
