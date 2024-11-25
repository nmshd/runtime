import { DatawalletSynchronizedEvent, IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { LocalAccountDeletionDateChangedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface DatawalletSynchronizedModuleConfig extends AppRuntimeModuleConfiguration {}

export class DatawalletSynchronizedModuleError extends AppRuntimeError {}

export class DatawalletSynchronizedModule extends AppRuntimeModule<DatawalletSynchronizedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): Promise<void> | void {
        this.subscribeToEvent(DatawalletSynchronizedEvent, this.handleDatawalletSynchronized.bind(this));
    }

    private async handleDatawalletSynchronized(event: DatawalletSynchronizedEvent) {
        const previousDeletionDate = this.runtime.currentSession.account.deletionDate;

        const services = await this.runtime.getServices(event.eventTargetAddress);
        const identityDeletionProcessResult = await services.transportServices.identityDeletionProcesses.getIdentityDeletionProcesses();

        if (identityDeletionProcessResult.isError) {
            this.logger.error(identityDeletionProcessResult);
            return;
        }

        let newDeletionDate;
        const mostRecentIdentityDeletionProcess = identityDeletionProcessResult.value[identityDeletionProcessResult.value.length - 1];

        switch (mostRecentIdentityDeletionProcess.status) {
            case IdentityDeletionProcessStatus.Approved:
                newDeletionDate = mostRecentIdentityDeletionProcess.gracePeriodEndsAt;
                break;
            case IdentityDeletionProcessStatus.Cancelled:
            case IdentityDeletionProcessStatus.Rejected:
            case IdentityDeletionProcessStatus.WaitingForApproval:
                newDeletionDate = undefined;
                break;
        }

        if (previousDeletionDate === newDeletionDate) return;

        this.runtime.currentSession.account.deletionDate = newDeletionDate;
        await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, newDeletionDate);

        this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(event.eventTargetAddress, newDeletionDate));
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
