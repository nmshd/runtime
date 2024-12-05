import { CoreDate } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus, IdentityDeletionProcessStatusChangedEvent } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { LocalAccountDeletionDateChangedEvent } from "../../events";
import { LocalAccountMapper } from "../../multiAccount/data/LocalAccountMapper";
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

        if (!identityDeletionProcess) {
            const services = await this.runtime.getServices(event.eventTargetAddress);
            const identityDeletionProcesses = await services.transportServices.identityDeletionProcesses.getIdentityDeletionProcesses();

            const approvedIdentityDeletionProcess = identityDeletionProcesses.value.filter((idp) => idp.status === IdentityDeletionProcessStatus.Approved).at(0);
            const deletionDate = approvedIdentityDeletionProcess?.gracePeriodEndsAt ? CoreDate.from(approvedIdentityDeletionProcess.gracePeriodEndsAt) : undefined;

            await this.updateLocalAccountDeletionDate(event.eventTargetAddress, deletionDate, true);
            return;
        }

        switch (identityDeletionProcess.status) {
            case IdentityDeletionProcessStatus.Approved:
                await this.updateLocalAccountDeletionDate(event.eventTargetAddress, CoreDate.from(identityDeletionProcess.gracePeriodEndsAt!));
                break;

            case IdentityDeletionProcessStatus.Cancelled:
                await this.updateLocalAccountDeletionDate(event.eventTargetAddress, undefined);
                break;

            default:
                break;
        }
    }

    private async updateLocalAccountDeletionDate(eventTargetAddress: string, deletionDate: CoreDate | undefined, publishEvent = false) {
        const account = await this.runtime.multiAccountController.getAccountByAddress(eventTargetAddress);
        const previousDeletionDate = account.deletionDate;

        if (!deletionDate && !previousDeletionDate) return;
        if (deletionDate && previousDeletionDate && deletionDate.equals(previousDeletionDate)) return;

        const localAccount = await this.runtime.multiAccountController.updateLocalAccountDeletionDate(eventTargetAddress, deletionDate);

        if (!publishEvent) return;
        this.runtime.eventBus.publish(new LocalAccountDeletionDateChangedEvent(eventTargetAddress, LocalAccountMapper.toLocalAccountDTO(localAccount)));
    }

    public override stop(): Promise<void> | void {
        this.unsubscribeFromAllEvents();
    }
}
