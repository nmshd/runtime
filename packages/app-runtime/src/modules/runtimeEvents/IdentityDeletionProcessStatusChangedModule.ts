import { CoreDate } from "@nmshd/core-types";
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
                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, CoreDate.from(identityDeletionProcess.gracePeriodEndsAt!));
                break;

            case IdentityDeletionProcessStatus.Cancelled:
                const account = await this.runtime.multiAccountController.getAccountByAddress(event.eventTargetAddress);
                const previousDeletionDate = account.deletionDate;

                if (!previousDeletionDate) break;

                await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, undefined);
                break;

            default:
                break;
        }
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
