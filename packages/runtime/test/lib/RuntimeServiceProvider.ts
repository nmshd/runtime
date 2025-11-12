import { AnonymousServices, AutomationConfig, ConsumptionServices, DataViewExpander, RuntimeConfig, TransportServices } from "@nmshd/runtime";
import { IConfigOverwrite } from "@nmshd/transport";
import correlator from "correlation-id";
import { MockEventBus } from "./MockEventBus.js";
import { TestRuntime } from "./TestRuntime.js";

export interface TestRuntimeServices {
    transport: TransportServices;
    consumption: ConsumptionServices;
    anonymous: AnonymousServices;
    expander: DataViewExpander;
    eventBus: MockEventBus;
    address: string;
}

export interface LaunchConfiguration {
    enableDatawallet?: boolean;
    enableDeciderModule?: boolean;
    deciderModuleAutomations?: AutomationConfig[];
    enableRequestModule?: boolean;
    enableNotificationModule?: boolean;
    enableDefaultOwnIdentityAttributes?: boolean;
    useCorrelator?: boolean;
}

export class RuntimeServiceProvider {
    private readonly runtimes: TestRuntime[] = [];

    public static get transportConfig(): Omit<IConfigOverwrite, "supportedIdentityVersion"> {
        return {
            baseUrl: process.env.NMSHD_TEST_BASEURL!,
            platformClientId: process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: process.env.NMSHD_TEST_CLIENTSECRET!,
            addressGenerationHostnameOverride: globalThis.process.env.NMSHD_TEST_ADDRESS_GENERATION_HOSTNAME_OVERRIDE,
            debug: true
        };
    }

    private static readonly _runtimeConfig: RuntimeConfig = {
        transportLibrary: this.transportConfig,
        modules: {
            decider: { enabled: false, location: "@nmshd/runtime:DeciderModule" },
            request: { enabled: false, location: "@nmshd/runtime:RequestModule" },
            notification: { enabled: false, location: "@nmshd/runtime:NotificationModule" }
        }
    };

    public static get defaultConfig(): RuntimeConfig {
        const notDefinedEnvironmentVariables = ["NMSHD_TEST_BASEURL", "NMSHD_TEST_CLIENTID", "NMSHD_TEST_CLIENTSECRET"].filter((env) => !process.env[env]);

        if (notDefinedEnvironmentVariables.length > 0) {
            throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`);
        }

        const copy = JSON.parse(JSON.stringify(RuntimeServiceProvider._runtimeConfig));
        return copy;
    }

    public async launch(count: number, launchConfiguration: LaunchConfiguration = {}): Promise<TestRuntimeServices[]> {
        const runtimeServices: TestRuntimeServices[] = [];

        for (let i = 0; i < count; i++) {
            const config = RuntimeServiceProvider.defaultConfig;

            if (launchConfiguration.enableDatawallet) {
                config.transportLibrary.datawalletEnabled = true;
            }

            if (launchConfiguration.enableRequestModule) config.modules.request.enabled = true;
            if (launchConfiguration.enableDeciderModule) config.modules.decider.enabled = true;
            if (launchConfiguration.enableNotificationModule) config.modules.notification.enabled = true;

            config.modules.decider.automationConfig = launchConfiguration.deciderModuleAutomations;

            const runtime = new TestRuntime(
                config,
                {
                    setDefaultOwnIdentityAttributes: launchConfiguration.enableDefaultOwnIdentityAttributes ?? false
                },
                launchConfiguration.useCorrelator ? correlator : undefined
            );

            this.runtimes.push(runtime);

            await runtime.init();
            await runtime.start();

            const services = await runtime.getServices("");

            runtimeServices.push({
                transport: services.transportServices,
                consumption: services.consumptionServices,
                anonymous: runtime.anonymousServices,
                expander: services.dataViewExpander,
                eventBus: runtime.eventBus,
                address: (await services.transportServices.account.getIdentityInfo()).value.address
            });
        }

        return runtimeServices;
    }

    public async stop(): Promise<void> {
        for (const runtime of this.runtimes) {
            await runtime.stop();
        }
    }

    public resetEventBusses(): void {
        this.runtimes.forEach((r) => r.eventBus.reset());
    }
}
