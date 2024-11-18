import { AppRuntimeError } from "../../AppRuntimeError";
import { LocalAccountDeletionDateChangedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface LocalAccountDeletionDateChangedModuleConfig extends AppRuntimeModuleConfiguration {}

export class LocalAccountDeletionDateChangedModuleError extends AppRuntimeError {}

export class LocalAccountDeletionDateChangedModule extends AppRuntimeModule<LocalAccountDeletionDateChangedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(LocalAccountDeletionDateChangedEvent, this.handleLocalDeletionDateChanged.bind(this));
    }

    private async handleLocalDeletionDateChanged(event: LocalAccountDeletionDateChangedEvent) {
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        const deletionDate = event.data;

        // do something
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
