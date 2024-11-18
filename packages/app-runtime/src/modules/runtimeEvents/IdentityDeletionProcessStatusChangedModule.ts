import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface IdentityDeletionProcessStatusChangedModuleConfig extends AppRuntimeModuleConfiguration {}

export class IdentityDeletionProcessChangedModuleError extends AppRuntimeError {}

export class IdentityDeletionProcessStatusChangedModule extends AppRuntimeModule<IdentityDeletionProcessStatusChangedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): Promise<void> | void {
        this.subscribeToEvent(IdentityDeletionProcessStatusChangedEvent, this.handleIdentityDeletionProcessStatusChanged.bind(this));
    }

    private async handleIdentityDeletionProcessStatusChanged(event: IdentityDeletionProcessStatusChangedEvent) {
        if (event.data.status === IdentityDeletionProcessStatus.Approved) {
            this.runtime.currentSession.account.deletionDate = event.data.gracePeriodEndsAt;
            await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, event.data.gracePeriodEndsAt);
        } else {
            delete this.runtime.currentSession.account.deletionDate;
            await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress);
        }

        // await this.runtime.currentSession.transportServices.account.syncEverything();
        // await this.runtime.currentSession.transportServices.account.syncDatawallet();

        // fire LocalAccountChangedEvent

        // listen
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
