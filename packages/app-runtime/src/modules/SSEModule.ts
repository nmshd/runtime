import { ILogger } from "@js-soft/logging-abstractions";
import { ModuleConfiguration } from "@nmshd/runtime";
import { EventSource } from "eventsource";
import { AppRuntime } from "../AppRuntime.js";
import { AccountSelectedEvent } from "../events/index.js";
import { LocalAccountSession } from "../multiAccount/index.js";
import { AppRuntimeModule } from "./AppRuntimeModule.js";

export interface SSEModuleConfiguration extends ModuleConfiguration {
    baseUrlOverride?: string;
}

export class SSEModule extends AppRuntimeModule<SSEModuleConfiguration> {
    private eventSource: Record<string, EventSource | undefined> = {};

    public constructor(runtime: AppRuntime, configuration: SSEModuleConfiguration, logger: ILogger) {
        super(runtime, configuration, logger);
    }

    public init(): void {
        // Nothing to do here
    }

    public async start(): Promise<void> {
        for (const session of this.runtime.getSessions()) {
            await this.runSync(session);
            await this.recreateEventSource(session);
        }

        this.subscribeToEvent(AccountSelectedEvent, this.handleAccountSelected.bind(this));
    }

    private async handleAccountSelected(event: AccountSelectedEvent) {
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        if (this.eventSource[session.account.id]) return;

        await this.runSync(session);
        await this.recreateEventSource(session);
    }

    private async recreateEventSource(session: LocalAccountSession): Promise<void> {
        const existingEventSource = this.eventSource[session.account.id];
        if (existingEventSource) {
            try {
                existingEventSource.close();
            } catch (error) {
                this.logger.error("Failed to close event source", error);
            }
        }

        const baseUrl = this.configuration.baseUrlOverride ?? this.runtime["runtimeConfig"].transportLibrary.baseUrl;
        const sseUrl = `${baseUrl}/api/v2/sse`;

        this.logger.info(`Connecting to SSE endpoint: ${sseUrl}`);

        const eventSource = new EventSource(sseUrl, {
            fetch: async (url, options) => {
                const token = await session.accountController.authenticator.getToken();

                const result = await fetch(url, {
                    ...options,
                    headers: { ...options.headers, authorization: `Bearer ${token}` }
                });

                this.logger.info(`SSE fetch result: ${result.status}`);

                return result;
            }
        });

        this.eventSource[session.account.id] = eventSource;

        eventSource.addEventListener("ExternalEventCreated", async () => await this.runSync(session));

        await new Promise<void>((resolve, reject) => {
            eventSource.onopen = () => {
                this.logger.info("Connected to SSE endpoint");
                resolve();

                eventSource.onopen = () => {
                    // noop
                };
            };

            eventSource.onerror = (error) => {
                reject(error);
            };
        });

        eventSource.onerror = async (error) => {
            if (error.code === 401) await this.recreateEventSource(session);
        };
    }

    private async runSync(session: LocalAccountSession): Promise<void> {
        const syncResult = await session.transportServices.account.syncEverything();
        if (syncResult.isError) {
            this.logger.error(syncResult);
        }
    }

    public override stop(): void {
        for (const eventsource of Object.values(this.eventSource)) {
            eventsource?.close();
        }
    }
}
