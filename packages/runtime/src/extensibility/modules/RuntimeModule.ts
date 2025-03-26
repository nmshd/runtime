import { ILogger } from "@js-soft/logging-abstractions";
import { EventHandler, SubscriptionTarget } from "@js-soft/ts-utils";
import { Runtime } from "../../Runtime";

export interface ModuleConfiguration {
    enabled: boolean;
    displayName?: string;
    location: string;
}

export abstract class RuntimeModule<TConfig extends ModuleConfiguration = ModuleConfiguration, TRuntime extends Runtime = Runtime> {
    public constructor(
        public readonly runtime: TRuntime,
        public readonly configuration: TConfig,
        public readonly logger: ILogger
    ) {
        const originalStopMethod = this.stop;
        this.stop = async () => {
            await originalStopMethod.call(this);
            this.#unsubscribeFromAllEvents();
        };
    }

    public get displayName(): string {
        return this.configuration.displayName ?? this.constructor.name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    }

    public abstract init(): Promise<void> | void;
    public abstract start(): Promise<void> | void;
    public stop(): Promise<void> | void {
        // Nothing to do here
    }

    private readonly subscriptionIds: number[] = [];

    protected subscribeToEvent<TEvent>(event: SubscriptionTarget<TEvent>, handler: EventHandler<TEvent>): void {
        const subscriptionId = this.runtime.eventBus.subscribe(event, handler);
        this.subscriptionIds.push(subscriptionId);
    }

    #unsubscribeFromAllEvents(): void {
        this.subscriptionIds.forEach((id) => this.runtime.eventBus.unsubscribe(id));
        this.subscriptionIds.splice(0);
    }
}
