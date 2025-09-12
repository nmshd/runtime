import { log } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { ClientResult, ControllerName, DbCollectionName, TransportController } from "../../core";
import { IdentityDeletionProcessStatusChangedEvent } from "../../events";
import { AccountController } from "../accounts/AccountController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneIdentityDeletionProcess } from "./backbone/BackboneIdentityDeletionProcess";
import { IdentityDeletionProcessClient } from "./backbone/IdentityDeletionProcessClient";
import { CachedIdentityDeletionProcess } from "./data/CachedIdentityDeletionProcess";
import { IdentityDeletionProcess } from "./data/IdentityDeletionProcess";
import { IdentityDeletionProcessStatus } from "./data/IdentityDeletionProcessStatus";

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

    public async updateCacheOfExistingIdentityDeletionProcess(identityDeletionProcess: string): Promise<IdentityDeletionProcess> {
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
        const { id, ...cache } = response.value;

        const identityDeletionProcess = IdentityDeletionProcess.from({ id: id });
        const cachedIdentityDeletionProcess = CachedIdentityDeletionProcess.from(cache);
        identityDeletionProcess.setCache(cachedIdentityDeletionProcess);
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

    public async getIdentityDeletionProcessByStatus(...identityDeletionProcessStatus: IdentityDeletionProcessStatus[]): Promise<IdentityDeletionProcess | undefined> {
        const identityDeletionProcess = await this.identityDeletionProcessCollection.findOne({
            $or: identityDeletionProcessStatus.map((status) => {
                return { "cache.status": status };
            })
        });
        return identityDeletionProcess ? IdentityDeletionProcess.from(identityDeletionProcess) : undefined;
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedIdentityDeletionProcess }[]> {
        if (ids.length === 0) return [];
        const getIdentityDeletionPromises = ids.map((id) => this.identityDeletionProcessClient.getIdentityDeletionProcess(id.toString()));
        const backboneTokens: { id: CoreId; cache: CachedIdentityDeletionProcess }[] = [];

        const identityDeletionProcesses = await Promise.all(getIdentityDeletionPromises);

        for (const identityDeletionProcess of identityDeletionProcesses) {
            const { id, ...cache } = identityDeletionProcess.value;
            backboneTokens.push({ id: CoreId.from(id), cache: CachedIdentityDeletionProcess.from(cache) });
        }

        return backboneTokens;
    }
}
