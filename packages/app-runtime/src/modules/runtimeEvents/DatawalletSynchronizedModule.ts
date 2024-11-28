import { CoreDate } from "@nmshd/core-types";
import { DatawalletSynchronizedEvent, IdentityDeletionProcessStatus } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { LocalAccountDeletionDateChangedEvent } from "../../events";
import { LocalAccountMapper } from "../../multiAccount";
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
        const services = await this.runtime.getServices(event.eventTargetAddress);
        const identityDeletionProcessResult = await services.transportServices.identityDeletionProcesses.getIdentityDeletionProcesses();

        if (identityDeletionProcessResult.isError) {
            this.logger.error(identityDeletionProcessResult);
            return;
        }

        if (identityDeletionProcessResult.value.length === 0) return;

        const mostRecentIdentityDeletionProcess = identityDeletionProcessResult.value.at(-1)!;
        let newDeletionDate;
        switch (mostRecentIdentityDeletionProcess.status) {
            case IdentityDeletionProcessStatus.Approved:
                newDeletionDate = CoreDate.from(mostRecentIdentityDeletionProcess.gracePeriodEndsAt!);
                break;
            case IdentityDeletionProcessStatus.Cancelled:
            case IdentityDeletionProcessStatus.Rejected:
            case IdentityDeletionProcessStatus.WaitingForApproval:
                newDeletionDate = undefined;
                break;
        }

        const account = await this.runtime.multiAccountController.getAccountByAddress(event.eventTargetAddress);
        const previousDeletionDate = account.deletionDate;

        if (previousDeletionDate === newDeletionDate) return;

        await this.runtime.multiAccountController.updateLocalAccountDeletionDate(event.eventTargetAddress, newDeletionDate);

        const updatedAccount = await this.runtime.multiAccountController.getAccountByAddress(event.eventTargetAddress);
        this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(event.eventTargetAddress, LocalAccountMapper.toLocalAccountDTO(updatedAccount)));
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
