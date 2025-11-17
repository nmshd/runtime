import { NoLoginTestRuntime, RuntimeServiceProvider } from "../lib/index.js";

describe("Backbone Compatibility Check", () => {
    const serviceProvider = new RuntimeServiceProvider();
    let noLoginRuntime: NoLoginTestRuntime;

    let actualBackboneVersion: number;

    beforeAll(async () => {
        const runtime = new NoLoginTestRuntime({ transportLibrary: RuntimeServiceProvider.defaultConfig.transportLibrary, modules: RuntimeServiceProvider.defaultConfig.modules });
        await runtime.init();
        await runtime.start();

        const result = await runtime.anonymousServices.backboneCompatibility.checkBackboneCompatibility();
        actualBackboneVersion = result.value.backboneVersion;

        await runtime.stop();
    });

    afterEach(async () => {
        await serviceProvider.stop();
        await noLoginRuntime.stop();
    });

    test("should successfully check the compatibility", async () => {
        const transportConfigOverride = { supportedMinBackboneVersion: actualBackboneVersion, supportedMaxBackboneVersion: actualBackboneVersion };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();

        const result = await noLoginRuntime.anonymousServices.backboneCompatibility.checkBackboneCompatibility();

        expect(result).toBeSuccessful();
        expect(result.value.isCompatible).toBe(true);
    });

    test("should catch a too low Backbone version", async () => {
        const transportConfigOverride = { supportedMinBackboneVersion: actualBackboneVersion - 1, supportedMaxBackboneVersion: actualBackboneVersion - 1 };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();

        const result = await noLoginRuntime.anonymousServices.backboneCompatibility.checkBackboneCompatibility();

        expect(result).toBeSuccessful();
        expect(result.value.isCompatible).toBe(false);
    });

    test("should catch a too high Backbone version", async () => {
        const transportConfigOverride = { supportedMinBackboneVersion: actualBackboneVersion + 1, supportedMaxBackboneVersion: actualBackboneVersion + 1 };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();

        const result = await noLoginRuntime.anonymousServices.backboneCompatibility.checkBackboneCompatibility();

        expect(result).toBeSuccessful();
        expect(result.value.isCompatible).toBe(false);
    });
});
