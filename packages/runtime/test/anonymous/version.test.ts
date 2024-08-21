import { NoLoginTestRuntime, RuntimeServiceProvider, TestRuntime } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let noLoginRuntime: TestRuntime;

afterEach(async () => {
    await serviceProvider.stop();
    await noLoginRuntime.stop();
});

describe("Backbone Compatibility Check", () => {
    test("should successfully check the compatibility", async () => {
        const transportConfigOverride = {
            supportedMinBackboneVersion: 1,
            supportedMaxBackboneVersion: 5000
        };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();
        const result = await noLoginRuntime.anonymousServices.version.checkBackboneCompatibility();
        expect(result).toBeSuccessful();
    });

    test("should catch a too low backbone version", async () => {
        const transportConfigOverride = {
            supportedMinBackboneVersion: 5000,
            supportedMaxBackboneVersion: 6000
        };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();
        const result = await noLoginRuntime.anonymousServices.version.checkBackboneCompatibility();
        expect(result).toBeAnError(/.*/, "error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });

    test("should catch a too high backbone version", async () => {
        const transportConfigOverride = {
            supportedMinBackboneVersion: 1,
            supportedMaxBackboneVersion: 2
        };
        noLoginRuntime = new NoLoginTestRuntime({
            transportLibrary: { ...RuntimeServiceProvider.defaultConfig.transportLibrary, ...transportConfigOverride },
            modules: RuntimeServiceProvider.defaultConfig.modules
        });
        await noLoginRuntime.init();
        await noLoginRuntime.start();
        const result = await noLoginRuntime.anonymousServices.version.checkBackboneCompatibility();
        expect(result).toBeAnError(/.*/, "error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });
});
