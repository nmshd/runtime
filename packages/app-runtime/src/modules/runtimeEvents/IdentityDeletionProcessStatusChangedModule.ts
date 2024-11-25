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
        const identityDeletionProcess = event.data;

        switch (identityDeletionProcess.status) {
            case IdentityDeletionProcessStatus.Approved:
                this.runtime.currentSession.account.deletionDate = identityDeletionProcess.gracePeriodEndsAt;
                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, identityDeletionProcess.gracePeriodEndsAt);
                break;

            case IdentityDeletionProcessStatus.Cancelled:
                const previousDeletionDate = this.runtime.currentSession.account.deletionDate;
                if (!previousDeletionDate) break;

                this.runtime.currentSession.account.deletionDate = undefined;
                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress);
                break;

            default:
                break;
        }
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
