import { ILogger } from "@js-soft/logging-abstractions";
import { EventHandler, SubscriptionTarget } from "@js-soft/ts-utils";
import { ModuleConfiguration, RuntimeModule } from "@nmshd/runtime";
import { AppRuntime } from "../AppRuntime";

export interface IAppRuntimeModuleConstructor {
    new (runtime: AppRuntime, configuration: any, logger: ILogger): AppRuntimeModule;
}

export interface AppRuntimeModuleConfiguration extends ModuleConfiguration {}

export abstract class AppRuntimeModule<TConfig extends AppRuntimeModuleConfiguration = AppRuntimeModuleConfiguration> extends RuntimeModule<TConfig, AppRuntime> {
    private readonly nativeEventSubscriptionIds: number[] = [];

    protected subscribeToNativeEvent<TEvent>(event: SubscriptionTarget<TEvent>, handler: EventHandler<TEvent>): void {
        const subscriptionResult = this.runtime.nativeEnvironment.eventBus.subscribe(event, handler);
        this.nativeEventSubscriptionIds.push(subscriptionResult);
    }

    protected override unsubscribeFromAllEvents(): void {
        super.unsubscribeFromAllEvents();

        this.nativeEventSubscriptionIds.forEach((id) => this.runtime.nativeEnvironment.eventBus.unsubscribe(id));
        this.nativeEventSubscriptionIds.splice(0);
    }
}
