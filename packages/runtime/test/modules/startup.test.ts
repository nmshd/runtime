import { ModuleConfiguration, RuntimeModule } from "../../src";
import { RuntimeServiceProvider, TestRuntime } from "../lib";

describe("Runtime Module Startup", () => {
    const runtimes: TestRuntime[] = [];

    afterAll(async () => {
        for (const runtime of runtimes) {
            await runtime.stop();
        }
    });

    test("should prohibit starting the runtime with two modules that have denyMultipleInstances set to true", async () => {
        const runtime = new TestRuntime(
            {
                transportLibrary: RuntimeServiceProvider.transportConfig,
                modules: {
                    decider: { enabled: false, location: "@nmshd/runtime:DeciderModule" },
                    notification: { enabled: true, location: "@nmshd/runtime:NotificationModule" },
                    notification2: { enabled: true, location: "@nmshd/runtime:NotificationModule" }
                }
            },
            { setDefaultRepositoryAttributes: false }
        );
        runtimes.push(runtime);

        await expect(() => runtime.init()).rejects.toThrow("at location '@nmshd/runtime:NotificationModule' is not allowed to be used multiple times, but it has 2 instances.");
    });

    // eslint-disable-next-line jest/expect-expect -- no assertions are needed because it is sufficient that the startup does not throw an error
    test("should allow starting the runtime with two modules that have denyMultipleInstances set to false", async () => {
        const runtime = new TestRuntimeWithCustomModuleLoading(
            {
                transportLibrary: RuntimeServiceProvider.transportConfig,
                modules: {
                    decider: { enabled: false, location: "@nmshd/runtime:DeciderModule" },
                    customModule1: { enabled: true, location: "CustomModuleAllowingMultipleInstances" },
                    customModule2: { enabled: true, location: "CustomModuleAllowingMultipleInstances" }
                }
            },
            { setDefaultRepositoryAttributes: false }
        );
        runtimes.push(runtime);

        await runtime.init();
    });
});

class TestRuntimeWithCustomModuleLoading extends TestRuntime {
    // eslint-disable-next-line @typescript-eslint/require-await
    protected override async loadModule(moduleConfiguration: ModuleConfiguration): Promise<void> {
        if (moduleConfiguration.location !== "CustomModuleAllowingMultipleInstances") throw new Error("Module not found");

        const moduleInstance = new CustomModuleAllowingMultipleInstances(this, moduleConfiguration, this.loggerFactory.getLogger(CustomModuleAllowingMultipleInstances));
        this.modules.add(moduleInstance);
    }
}

class CustomModuleAllowingMultipleInstances extends RuntimeModule {
    public static override readonly denyMultipleInstances: boolean = false;

    public override init(): void {
        // noop
    }
    public override start(): void {
        // noop
    }
}
