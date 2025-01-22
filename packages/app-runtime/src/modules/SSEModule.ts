import { ILogger } from "@js-soft/logging-abstractions";
import { ModuleConfiguration } from "@nmshd/runtime";
import { EventSource } from "eventsource";
import { AppRuntime } from "../AppRuntime";
import { AccountSelectedEvent } from "../events";
import { LocalAccountSession } from "../multiAccount";
import { AppRuntimeModule } from "./AppRuntimeModule";

export class SSEModule extends AppRuntimeModule {
    private eventSource: Record<string, EventSource | undefined>;

    public constructor(runtime: AppRuntime, configuration: ModuleConfiguration, logger: ILogger) {
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

        const baseUrl = this.runtime["runtimeConfig"].transportLibrary.baseUrl;
        const sseUrl = `${baseUrl}/api/v1/sse`;

        this.logger.info(`Connecting to SSE endpoint: ${sseUrl}`);

        const eventSource = new EventSource(sseUrl, {
            fetch: async (url, options) => {
                const token = await session.accountController.authenticator.getToken();

                return await fetch(url, {
                    ...options,
                    headers: { ...options?.headers, authorization: `Bearer ${token}` }
                });
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
        this.logger.info("Running sync");

        const syncResult = await session.transportServices.account.syncEverything();
        if (syncResult.isError) {
            this.logger.error(syncResult);
        }
    }

    public stop(): void {
        for (const eventsource of Object.values(this.eventSource).filter((eventsource) => typeof eventsource !== "undefined")) {
            eventsource.close();
        }
    }
}
