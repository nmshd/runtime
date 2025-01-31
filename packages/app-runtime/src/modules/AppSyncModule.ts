import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "./AppRuntimeModule";

export interface AppSyncModuleConfiguration extends AppRuntimeModuleConfiguration {
    interval: number;
}

export class AppSyncModule extends AppRuntimeModule<AppSyncModuleConfiguration> {
    private syncTimeout: any;
    private started = false;

    public get isStarted(): boolean {
        return this.started;
    }

    public init(): void {
        // Nothing to do here
    }

    public start(): void {
        this.sync().catch((e) => {
            this.logger.error(e);
        });
        this.started = true;
    }

    private async sync(): Promise<void> {
        for (const session of this.runtime.getSessions()) {
            const result = await session.transportServices.account.syncEverything();
            if (result.isError) {
                this.logger.error(result.error);
            }
        }

        if (this.started) {
            this.syncTimeout = setTimeout(() => this.sync(), this.configuration.interval * 1000);
        }
    }

    public stop(): void {
        this.started = false;
        clearTimeout(this.syncTimeout);
    }
}
