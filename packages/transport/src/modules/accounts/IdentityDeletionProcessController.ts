import { log } from "@js-soft/ts-utils";
import { ClientResult, ControllerName, DbCollectionName, TransportController } from "../../core/index.js";
import { IdentityDeletionProcessStatusChangedEvent } from "../../events/index.js";
import { AccountController } from "../accounts/AccountController.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { BackboneIdentityDeletionProcess } from "./backbone/BackboneIdentityDeletionProcess.js";
import { IdentityDeletionProcessClient } from "./backbone/IdentityDeletionProcessClient.js";
import { IdentityDeletionProcess } from "./data/IdentityDeletionProcess.js";
import { IdentityDeletionProcessStatus } from "./data/IdentityDeletionProcessStatus.js";

export class IdentityDeletionProcessController extends TransportController {
    public identityDeletionProcessClient: IdentityDeletionProcessClient;
    public identityDeletionProcessCollection: SynchronizedCollection;

    public constructor(parent: AccountController) {
        super(ControllerName.Identity, parent);

        this.identityDeletionProcessClient = new IdentityDeletionProcessClient(this.config, this.parent.authenticator, this.transport.correlator);
    }

    @log()
    public override async init(): Promise<IdentityDeletionProcessController> {
        await super.init();

        this.identityDeletionProcessCollection = await this.parent.getSynchronizedCollection(DbCollectionName.IdentityDeletionProcess);
        return this;
    }

    public async loadNewIdentityDeletionProcessFromBackbone(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessJSONResponse = await this.identityDeletionProcessClient.getIdentityDeletionProcess(identityDeletionProcessId);

        const newIdentityDeletionProcess = this.createIdentityDeletionProcessFromBackboneResponse(identityDeletionProcessJSONResponse);
        await this.identityDeletionProcessCollection.create(newIdentityDeletionProcess);
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.parent.identity.address.toString(), newIdentityDeletionProcess));
        return newIdentityDeletionProcess;
    }

    public async updateExistingIdentityDeletionProcessFromBackbone(identityDeletionProcess: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessJSONResponse = await this.identityDeletionProcessClient.getIdentityDeletionProcess(identityDeletionProcess);
        const newIdentityDeletionProcess = this.createIdentityDeletionProcessFromBackboneResponse(identityDeletionProcessJSONResponse);

        await this.updateIdentityDeletionProcess(newIdentityDeletionProcess);
        return newIdentityDeletionProcess;
    }

    public async updateIdentityDeletionProcess(identityDeletionProcess: IdentityDeletionProcess): Promise<void> {
        const oldIdentityDeletionProcess = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcess.id.toString() });
        await this.identityDeletionProcessCollection.update(oldIdentityDeletionProcess, identityDeletionProcess);
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));
    }

    public createIdentityDeletionProcessFromBackboneResponse(response: ClientResult<BackboneIdentityDeletionProcess>): IdentityDeletionProcess {
        const identityDeletionProcess = IdentityDeletionProcess.from({ ...response.value });
        return identityDeletionProcess;
    }

    public async initiateIdentityDeletionProcess(lengthOfGracePeriodInDays?: number): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityDeletionProcessClient.initiateIdentityDeletionProcess({ lengthOfGracePeriodInDays });

        const identityDeletionProcess = this.createIdentityDeletionProcessFromBackboneResponse(identityDeletionProcessResponse);

        await this.identityDeletionProcessCollection.create(identityDeletionProcess);
        this.eventBus.publish(new IdentityDeletionProcessStatusChangedEvent(this.parent.identity.address.toString(), identityDeletionProcess));

        return identityDeletionProcess;
    }

    public async cancelIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess> {
        const identityDeletionProcessResponse = await this.identityDeletionProcessClient.cancelIdentityDeletionProcess(identityDeletionProcessId);
        const identityDeletionProcess = this.createIdentityDeletionProcessFromBackboneResponse(identityDeletionProcessResponse);
        await this.updateIdentityDeletionProcess(identityDeletionProcess);
        return identityDeletionProcess;
    }

    public async getIdentityDeletionProcess(identityDeletionProcessId: string): Promise<IdentityDeletionProcess | undefined> {
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({ id: identityDeletionProcessId });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }

    public async getIdentityDeletionProcesses(): Promise<IdentityDeletionProcess[]> {
        return (await this.identityDeletionProcessCollection.find())
            .map((identityDeletionProcess) => (identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined))
            .filter((identityDeletionProcess) => !!identityDeletionProcess);
    }

    public async getIdentityDeletionProcessByStatus(
        ...identityDeletionProcessStatus: [IdentityDeletionProcessStatus, ...IdentityDeletionProcessStatus[]]
    ): Promise<IdentityDeletionProcess | undefined> {
        const query: any = { $or: identityDeletionProcessStatus.map((status) => ({ status: status })) };

        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne(query);
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }
}
