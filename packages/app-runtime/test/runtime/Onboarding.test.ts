import { AppRuntime, AppRuntimeServices } from "../../src";
import { TestUtil } from "../lib";

describe("Onboarding", function () {
    let runtime: AppRuntime;

    let services1: AppRuntimeServices;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const [localAccount1] = await TestUtil.provideAccounts(runtime, 1);
        services1 = await runtime.getServices(localAccount1.id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should throw when onboarding a second account with the same address", async function () {
        const createDeviceResult = await services1.transportServices.devices.createDevice({});
        const onboardingInfoResult = await services1.transportServices.devices.getDeviceOnboardingInfo({ id: createDeviceResult.value.id });

        await expect(() => runtime.accountServices.onboardAccount(onboardingInfoResult.value)).rejects.toThrow("error.app-runtime.onboardedAccountAlreadyExists");
    });
});
