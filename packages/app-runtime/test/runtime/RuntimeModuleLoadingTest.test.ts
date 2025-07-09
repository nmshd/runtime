import { AppRuntime, AppRuntimeModule } from "../../src";
import { TestUtil } from "../lib";

describe("RuntimeModuleLoading", function () {
    let runtime: AppRuntime;

    let moduleInitialized = false;
    let moduleStarted = false;
    let moduleStopped = false;

    beforeAll(function () {
        runtime = TestUtil.createRuntimeWithoutInit({
            modules: {
                testModule: { enabled: true, location: "testModule" }
            }
        });

        class TestModule extends AppRuntimeModule {
            public init(): void {
                moduleInitialized = true;
            }

            public start(): void {
                moduleStarted = true;
            }

            public override stop(): void {
                moduleStopped = true;
            }
        }

        AppRuntime.registerModule("testModule", TestModule);
    });

    test("should init the module", async function () {
        await runtime.init();
        expect(moduleInitialized).toBe(true);
    });

    test("should start and stop the module", async function () {
        await runtime.start();
        expect(moduleStarted).toBe(true);
    });

    test("should stop the module", async function () {
        await runtime.stop();
        expect(moduleStopped).toBe(true);
    });
});
