import { AnonymousServices, ConsumptionServices, DataViewExpander, DeciderModuleConfigurationOverwrite, RuntimeConfig, TransportServices } from "../../src";
import { MockEventBus } from "./MockEventBus";
import { TestRuntime } from "./TestRuntime";

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
    configureDeciderModule?: DeciderModuleConfigurationOverwrite; // TODO: can we check that this is only set if enableDeciderModule is set too?
    enableRequestModule?: boolean;
    enableAttributeListenerModule?: boolean;
    enableNotificationModule?: boolean;
    enableDefaultRepositoryAttributes?: boolean;
}

export class RuntimeServiceProvider {
    private readonly runtimes: TestRuntime[] = [];

    private static readonly _runtimeConfig: RuntimeConfig = {
        transportLibrary: {
            baseUrl: process.env.NMSHD_TEST_BASEURL!,
            platformClientId: process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: process.env.NMSHD_TEST_CLIENTSECRET!,
            debug: true
        },
        modules: {
            decider: {
                enabled: false,
                displayName: "Decider Module",
                name: "DeciderModule",
                location: "@nmshd/runtime:DeciderModule"
            },
            request: {
                enabled: false,
                displayName: "Request Module",
                name: "RequestModule",
                location: "@nmshd/runtime:RequestModule"
            },
            attributeListener: {
                enabled: false,
                displayName: "Attribute Listener Module",
                name: "AttributeListenerModule",
                location: "@nmshd/runtime:AttributeListenerModule"
            },
            notification: {
                enabled: false,
                displayName: "Notification Module",
                name: "NotificationModule",
                location: "@nmshd/runtime:NotificationModule"
            }
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
            if (launchConfiguration.enableAttributeListenerModule) config.modules.attributeListener.enabled = true;
            if (launchConfiguration.enableNotificationModule) config.modules.notification.enabled = true;

            config.modules.decider.automationConfig = launchConfiguration.configureDeciderModule?.automationConfig;

            const runtime = new TestRuntime(config, {
                setDefaultRepositoryAttributes: launchConfiguration.enableDefaultRepositoryAttributes ?? false
            });
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
