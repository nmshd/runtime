import { log } from "@js-soft/ts-utils";
import { ControllerName, TransportController } from "../../core";
import { IdentityDeletionProcessStatusChangedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { IdentityDeletionProcessClient } from "./backbone/IdentityDeletionProcessClient";
import { IdentityDeletionProcess } from "./data/IdentityDeletionProcess";
import { IdentityDeletionProcessStatus } from "./data/IdentityDeletionProcessStatus";

export class IdentityDeletionProcessController extends TransportController {
    public identityDeletionProcessClient: IdentityDeletionProcessClient;
    public identityDeletionProcessCollection: SynchronizedCollection;

    public constructor(parent: AccountController) {
        super(ControllerName.Identity, parent);

        this.identityDeletionProcessClient = new IdentityDeletionProcessClient(this.config, this.parent.authenticator);
    }

    @log()
    public override async init(): Promise<IdentityDeletionProcessController> {
        await super.init();

        this.identityDeletionProcessCollection = await this.parent.getSynchronizedCollection("IdentityDeletionProcesses");
        return this;
    }

    private async updateIdentityDeletionProcess(identityDeletionProcess: IdentityDeletionProcess): Promise<void> {
        const oldIdentityDeletion = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcess.id.toString() });
        await this.identityDeletionProcessCollection.update(oldIdentityDeletion, identityDeletionProcess);
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess | undefined> {
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcessId });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }

    public async getIdentityDeletionProcesses(): Promise<IdentityDeletionProcess[]> {
        return (await this.identityDeletionProcessCollection.find())
            .map((identityDeletionProcess) => (identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined))
            .filter((identityDeletionProcess) => !!identityDeletionProcess) as IdentityDeletionProcess[];
    }

    public async getIdentityDeletionProcessByStatus(
        identityDeletionProcessStatus: IdentityDeletionProcessStatus | IdentityDeletionProcessStatus[]
    ): Promise<IdentityDeletionProcess | undefined> {
        if (!Array.isArray(identityDeletionProcessStatus)) {
            identityDeletionProcessStatus = [identityDeletionProcessStatus];
        }
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({
            $or: identityDeletionProcessStatus.map((status) => {
                return { status };
            })
        });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }

    public async approveIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityDeletionProcessClient.approveIdentityDeletionProcess(identityDeletionProcessId);
        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessResponse.value);
        await this.updateIdentityDeletionProcess(identityDeletionProcess);
        return identityDeletionProcess;
    }

    public async rejectIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityDeletionProcessClient.rejectIdentityDeletionProcess(identityDeletionProcessId);
        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessResponse.value);
        await this.updateIdentityDeletionProcess(identityDeletionProcess);
        return identityDeletionProcess;
    }

    public async initiateIdentityDeletionProcess(): Promise<IdentityDeletionProcess> {
        const initiateIdentityDeletionResponse = await this.identityDeletionProcessClient.initiateIdentityDeletionProcess();
        const identityDeletionProcess = IdentityDeletionProcess.from(initiateIdentityDeletionResponse.value);

        await this.identityDeletionProcessCollection.create(identityDeletionProcess);
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityDeletionProcessClient.cancelIdentityDeletionProcess(identityDeletionProcessId);
        const identityDeletionProcess = IdentityDeletionProcess.from(identityDeletionProcessResponse.value);
        await this.updateIdentityDeletionProcess(identityDeletionProcess);
        return identityDeletionProcess;
    }
}
