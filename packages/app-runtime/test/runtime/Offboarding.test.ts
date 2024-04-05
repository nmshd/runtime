import { sleep } from "@js-soft/ts-utils";
import { AppRuntime, AppRuntimeServices, LocalAccountDTO } from "../../src";
import { TestUtil } from "../lib";

describe("Offboarding", function () {
    let runtime: AppRuntime;

    let localAccount1: LocalAccountDTO;
    let localAccount2: LocalAccountDTO;

    let services1: AppRuntimeServices;
    let services2: AppRuntimeServices;

    let device2Id: string;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        [localAccount1] = await TestUtil.provideAccounts(runtime, 1);

        services1 = await runtime.getServices(localAccount1.address!);

        const createDeviceResult = await services1.transportServices.devices.createDevice({});
        device2Id = createDeviceResult.value.id;

        const onboardingInfoResult = await services1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id });

        localAccount2 = await runtime.accountServices.onboardAccount(onboardingInfoResult.value);
        services2 = await runtime.getServices(localAccount2.address!);

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
        await sleep(1000);
        await services1.transportServices.account.syncDatawallet();

        const devices = await services1.transportServices.devices.getDevices();
        const device = devices.value.find((d) => d.id === device2Id);

        expect(device).toBeDefined();
        expect(device!.isOffboarded).toBe(true);
    });

    test("device should be flagged as offboarded when querying the device", async function () {
        await services1.transportServices.account.syncDatawallet();

        const deviceResult = await services1.transportServices.devices.getDevice({ id: device2Id });
        const device = deviceResult.value;

        expect(device).toBeDefined();
        expect(device.isOffboarded).toBe(true);
    });
});
