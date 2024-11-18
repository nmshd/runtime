import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { LocalAccountDeletionDateChangedEvent } from "../../events";
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
                // TODO: why do we have to do this twice?
                this.runtime.currentSession.account.deletionDate = event.data.gracePeriodEndsAt;
                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, identityDeletionProcess.gracePeriodEndsAt);

                this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(event.eventTargetAddress, identityDeletionProcess.gracePeriodEndsAt));
                break;

            case IdentityDeletionProcessStatus.Cancelled:
                const previousDeletionDate = this.runtime.currentSession.account.deletionDate;
                if (!previousDeletionDate) break;

                this.runtime.currentSession.account.deletionDate = undefined;
                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress);

                this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(event.eventTargetAddress));
                break;

            default:
                break;
        }
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
