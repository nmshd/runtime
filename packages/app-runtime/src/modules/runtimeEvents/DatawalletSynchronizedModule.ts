import { DatawalletSynchronizedEvent } from "@nmshd/runtime";
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

        const newDeletionDate = identityDeletionProcessResult.value[0].gracePeriodEndsAt;

        if (previousDeletionDate === newDeletionDate) return;

        this.runtime.currentSession.account.deletionDate = newDeletionDate;
        await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, newDeletionDate);

        this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(event.eventTargetAddress, newDeletionDate));
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
