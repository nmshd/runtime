import { IDatabaseCollection, IDatabaseMap } from "@js-soft/docdb-access-abstractions";
import { log } from "@js-soft/ts-utils";
import { CoreDate, CoreError, CoreId } from "@nmshd/core-types";
import { ControllerName, RequestError, TransportController, TransportCoreErrors, TransportError, TransportLoggerFactory } from "../../core";
import { DependencyOverrides } from "../../core/DependencyOverrides";
import { DatawalletSynchronizedEvent } from "../../events/DatawalletSynchronizedEvent";
import { AccountController } from "../accounts/AccountController";
import { ChangedItems } from "./ChangedItems";
import { DatawalletModificationMapper } from "./DatawalletModificationMapper";
import { CacheFetcher, DatawalletModificationsProcessor } from "./DatawalletModificationsProcessor";
import { WhatToSync } from "./WhatToSync";
import { BackboneDatawalletModification } from "./backbone/BackboneDatawalletModification";
import { BackboneSyncRun } from "./backbone/BackboneSyncRun";
import { CreateDatawalletModificationsRequestItem } from "./backbone/CreateDatawalletModifications";
import { FinalizeSyncRunRequestExternalEventResult } from "./backbone/FinalizeSyncRun";
import { StartSyncRunStatus, SyncRunType } from "./backbone/StartSyncRun";
import { ISyncClient, SyncClient } from "./backbone/SyncClient";
import { ExternalEvent } from "./data/ExternalEvent";
import { ExternalEventProcessorRegistry } from "./externalEventProcessors";
import { DatawalletModification } from "./local/DatawalletModification";
import { DeviceMigrations } from "./migrations/DeviceMigrations";
import { IdentityMigrations } from "./migrations/IdentityMigrations";

export class SyncController extends TransportController {
    private syncInfo: IDatabaseMap;
    private readonly client: ISyncClient;
    private readonly deviceMigrations: DeviceMigrations;
    private readonly identityMigrations: IdentityMigrations;
    private readonly externalEventRegistry = new ExternalEventProcessorRegistry();

    private _cacheFetcher?: CacheFetcher;
    private get cacheFetcher() {
        this._cacheFetcher ??= new CacheFetcher(this.parent.files, this.parent.relationshipTemplates, this.parent.identityDeletionProcess);

        return this._cacheFetcher;
    }

    public constructor(
        parent: AccountController,
        dependencyOverrides: DependencyOverrides,
        private readonly unpushedDatawalletModifications: IDatabaseCollection,
        private readonly datawalletEnabled: boolean
    ) {
        super(ControllerName.Sync, parent);

        this.client = dependencyOverrides.syncClient ?? new SyncClient(this.config, this.parent.authenticator, this.transport.correlator);

        this.identityMigrations = new IdentityMigrations(this.parent);
        this.deviceMigrations = new DeviceMigrations(this.parent);
    }

    public override async init(): Promise<SyncController> {
        await super.init();

        this.syncInfo = await this.db.getMap("SyncInfo");

        return this;
    }

    private currentSync?: LocalSyncRun;
    private currentSyncRun?: BackboneSyncRun;

    public async sync(whatToSync: WhatToSync = "Everything"): Promise<ChangedItems> {
        if (this.currentSync?.includes(whatToSync)) {
            return await this.currentSync.promise;
        }

        if (this.currentSync && !this.currentSync.includes(whatToSync)) {
            await this.currentSync.promise.catch(() => {
                // ignore this error because we only want to wait for the current sync to finish before we are starting a new one
            });
            return await this.sync(whatToSync);
        }

        const syncPromise = this._syncAndResyncDatawallet(whatToSync);
        this.currentSync = new LocalSyncRun(syncPromise, whatToSync);

        try {
            return await this.currentSync.promise;
        } finally {
            this.currentSync = undefined;
        }
    }

    private async _syncAndResyncDatawallet(whatToSync: WhatToSync = "Everything") {
        const changedItems = new ChangedItems();

        try {
            await this._sync(whatToSync, changedItems);
        } finally {
            if (this.datawalletEnabled && (await this.unpushedDatawalletModifications.exists())) {
                await this.syncDatawallet(changedItems).catch((e) => this.log.error(e));
            }

            if (this.datawalletEnabled) {
                this.transport.eventBus.publish(new DatawalletSynchronizedEvent(this.parent.identity.address.toString()));
            }
        }

        return changedItems;
    }

    @log()
    private async _sync(whatToSync: WhatToSync, changedItems: ChangedItems): Promise<void> {
        if (whatToSync === "OnlyDatawallet") return await this.syncDatawallet(changedItems);

        await this.syncExternalEvents(changedItems);

        await this.setLastCompletedSyncTime();

        if (this.datawalletEnabled && (await this.unpushedDatawalletModifications.exists())) {
            await this.syncDatawallet(changedItems).catch((e) => this.log.error(e));
        }
    }

    private async syncExternalEvents(changedItems: ChangedItems): Promise<void> {
        let newUnsyncedExternalEventsExist = false;
        do {
            const syncRunWasStarted = await this.startExternalEventsSyncRun();

            if (!syncRunWasStarted) {
                await this.syncDatawallet(changedItems);
                return;
            }

            await this.applyIncomingDatawalletModifications();
            const result = await this.applyIncomingExternalEvents(changedItems);
            const finalizeResult = await this.finalizeExternalEventsSyncRun(result);

            newUnsyncedExternalEventsExist = finalizeResult.newUnsyncedExternalEventsExist;
        } while (newUnsyncedExternalEventsExist);
    }

    @log()
    private async syncDatawallet(changedItems: ChangedItems): Promise<void> {
        if (!this.datawalletEnabled) return;

        const identityDatawalletVersion = await this.getIdentityDatawalletVersion();

        if (this.config.supportedDatawalletVersion < identityDatawalletVersion) {
            // This means that the datawallet of the identity was upgraded by another device with a higher version.
            // It is necessary to update the current device.
            throw TransportCoreErrors.datawallet.insufficientSupportedDatawalletVersion(this.config.supportedDatawalletVersion, identityDatawalletVersion);
        }

        this.log.trace("Synchronization of Datawallet events started...");

        try {
            const changedObjectIdentifiers = await this.applyIncomingDatawalletModifications();
            changedItems.addChangedObjectsIdentifiersDuringDatawalletSync(changedObjectIdentifiers);

            await this.pushLocalDatawalletModifications();

            await this.setLastCompletedDatawalletSyncTime();
        } catch (e: unknown) {
            const outdatedErrorCode = "error.platform.validation.datawallet.insufficientSupportedDatawalletVersion";
            if (!(e instanceof RequestError) || e.code !== outdatedErrorCode) throw e;

            throw TransportCoreErrors.datawallet.insufficientSupportedDatawalletVersion(this.config.supportedDatawalletVersion, identityDatawalletVersion);
        }

        this.log.trace("Synchronization of Datawallet events ended...");

        await this.checkDatawalletVersion(identityDatawalletVersion);
    }

    @log()
    private async checkDatawalletVersion(identityDatawalletVersion: number) {
        if (this.config.supportedDatawalletVersion < identityDatawalletVersion) {
            throw TransportCoreErrors.datawallet.insufficientSupportedDatawalletVersion(this.config.supportedDatawalletVersion, identityDatawalletVersion);
        }

        if (this.config.supportedDatawalletVersion > identityDatawalletVersion) {
            await this.upgradeIdentityDatawalletVersion(identityDatawalletVersion, this.config.supportedDatawalletVersion);
        }

        const deviceDatawalletVersion = this.parent.activeDevice.device.datawalletVersion ?? 0;
        if (deviceDatawalletVersion < identityDatawalletVersion) {
            await this.upgradeDeviceDatawalletVersion(deviceDatawalletVersion, this.config.supportedDatawalletVersion);
        }
    }

    @log()
    private async upgradeIdentityDatawalletVersion(identityDatawalletVersion: number, targetDatawalletVersion: number) {
        if (identityDatawalletVersion === targetDatawalletVersion) return;

        if (this.config.supportedDatawalletVersion < targetDatawalletVersion) {
            throw TransportCoreErrors.datawallet.insufficientSupportedDatawalletVersion(targetDatawalletVersion, identityDatawalletVersion);
        }

        if (identityDatawalletVersion > targetDatawalletVersion) {
            throw TransportCoreErrors.datawallet.currentBiggerThanTarget(identityDatawalletVersion, targetDatawalletVersion);
        }

        while (identityDatawalletVersion < targetDatawalletVersion) {
            identityDatawalletVersion++;

            await this.startDatawalletVersionUpgradeSyncRun();

            const migrationFunction = (this.identityMigrations as any)[`v${identityDatawalletVersion}`] as Function | undefined;
            if (!migrationFunction) {
                throw this.newNoMigrationAvailableError(identityDatawalletVersion);
            }

            await migrationFunction.call(this.identityMigrations);

            await this.finalizeDatawalletVersionUpgradeSyncRun(identityDatawalletVersion);
        }
    }

    @log()
    private async upgradeDeviceDatawalletVersion(deviceDatawalletVersion: number, targetDatawalletVersion: number) {
        if (deviceDatawalletVersion === targetDatawalletVersion) return;

        if (this.config.supportedDatawalletVersion < targetDatawalletVersion) {
            throw TransportCoreErrors.datawallet.insufficientSupportedDatawalletVersion(targetDatawalletVersion, deviceDatawalletVersion);
        }

        if (deviceDatawalletVersion > targetDatawalletVersion) {
            throw TransportCoreErrors.datawallet.currentBiggerThanTarget(deviceDatawalletVersion, targetDatawalletVersion);
        }

        while (deviceDatawalletVersion < targetDatawalletVersion) {
            deviceDatawalletVersion++;

            const migrationFunction = (this.deviceMigrations as any)[`v${deviceDatawalletVersion}`] as Function | undefined;
            if (!migrationFunction) {
                throw this.newNoMigrationAvailableError(deviceDatawalletVersion);
            }

            await migrationFunction.call(this.deviceMigrations);

            await this.parent.activeDevice.update({ datawalletVersion: deviceDatawalletVersion });
        }
    }

    private async applyIncomingDatawalletModifications(): Promise<string[]> {
        const getDatawalletModificationsResult = await this.client.getDatawalletModifications({ localIndex: await this.getLocalDatawalletModificationIndex() });

        const encryptedIncomingModifications = await getDatawalletModificationsResult.value.collect();
        if (encryptedIncomingModifications.length === 0) return [];

        const incomingModifications = await this.decryptDatawalletModifications(encryptedIncomingModifications);

        this.log.trace(`${incomingModifications.length} incoming modifications found`);

        const datawalletModificationsProcessor = new DatawalletModificationsProcessor(
            incomingModifications,
            this.cacheFetcher,
            this.db,
            TransportLoggerFactory.getLogger(DatawalletModificationsProcessor)
        );

        await datawalletModificationsProcessor.execute();

        this.log.trace(`${incomingModifications.length} incoming modifications executed`, incomingModifications);

        await this.updateLocalDatawalletModificationIndex(encryptedIncomingModifications.sort(descending)[0].index);

        return datawalletModificationsProcessor.changedObjectIdentifiers;
    }

    private async decryptDatawalletModifications(encryptedModifications: BackboneDatawalletModification[]): Promise<DatawalletModification[]> {
        const promises = encryptedModifications.map((m) => this.decryptDatawalletModification(m));
        return await Promise.all(promises);
    }

    private async decryptDatawalletModification(encryptedModification: BackboneDatawalletModification) {
        const decryptedPayload = await this.parent.activeDevice.secrets.decryptDatawalletModificationPayload(encryptedModification.encryptedPayload, encryptedModification.index);
        const decryptedModification = await DatawalletModificationMapper.fromBackboneDatawalletModification(
            encryptedModification,
            decryptedPayload,
            this.config.supportedDatawalletVersion
        );

        return decryptedModification;
    }

    private async pushLocalDatawalletModifications() {
        const { backboneModifications, localModificationIds } = await this.prepareLocalDatawalletModificationsForPush();

        if (backboneModifications.length === 0) {
            return;
        }

        const result = await this.client.createDatawalletModifications({
            localIndex: await this.getLocalDatawalletModificationIndex(),
            modifications: backboneModifications
        });

        await this.deleteUnpushedDatawalletModifications(localModificationIds);
        await this.updateLocalDatawalletModificationIndex(result.value.newIndex);
    }

    private async prepareLocalDatawalletModificationsForPush() {
        const backboneModifications: CreateDatawalletModificationsRequestItem[] = [];
        const localModificationIds: CoreId[] = [];

        if (!this.datawalletEnabled) {
            return { backboneModifications, localModificationIds };
        }

        const localDatawalletModifications = this.parseArray(await this.unpushedDatawalletModifications.list(), DatawalletModification);

        const localIndex = await this.getLocalDatawalletModificationIndex();
        let calculatedIndex = typeof localIndex !== "number" ? 0 : localIndex + 1;
        for (const localModification of localDatawalletModifications) {
            const encryptedPayload = await this.parent.activeDevice.secrets.encryptDatawalletModificationPayload(localModification, calculatedIndex++);
            const backboneModification = DatawalletModificationMapper.toCreateDatawalletModificationsRequestItem(localModification, encryptedPayload);

            localModificationIds.push(localModification.localId);
            backboneModifications.push(backboneModification);
        }
        return { backboneModifications, localModificationIds };
    }

    private async deleteUnpushedDatawalletModifications(localModificationIds: CoreId[]) {
        for (const localModificationId of localModificationIds) {
            await this.unpushedDatawalletModifications.delete({ localId: localModificationId.toString() });
        }
    }

    public async setInititalDatawalletVersion(version: number): Promise<void> {
        await this.startDatawalletVersionUpgradeSyncRun();
        await this.finalizeDatawalletVersionUpgradeSyncRun(version);
    }

    private async getIdentityDatawalletVersion() {
        const datawalletInfo = (await this.client.getDatawallet()).value;
        return datawalletInfo.version;
    }

    private async startExternalEventsSyncRun(): Promise<boolean> {
        const result = await this.client.startSyncRun({ type: SyncRunType.ExternalEventSync });

        if (result.value.status === StartSyncRunStatus.NoNewEvents) {
            return false;
        }

        this.currentSyncRun = result.value.syncRun ?? undefined;
        return this.currentSyncRun !== undefined;
    }

    private async startDatawalletVersionUpgradeSyncRun() {
        const result = await this.client.startSyncRun({ type: SyncRunType.DatawalletVersionUpgrade });

        this.currentSyncRun = result.value.syncRun ?? undefined;
        return this.currentSyncRun !== undefined;
    }

    private async applyIncomingExternalEvents(changedItems: ChangedItems): Promise<FinalizeSyncRunRequestExternalEventResult[]> {
        const getExternalEventsResult = await this.client.getExternalEventsOfSyncRun(this.currentSyncRun!.id.toString());

        if (getExternalEventsResult.isError) throw getExternalEventsResult.error;

        const externalEvents = await getExternalEventsResult.value.collect();

        const results: FinalizeSyncRunRequestExternalEventResult[] = [];

        for (const externalEvent of externalEvents) {
            try {
                const externalEventObject = ExternalEvent.fromAny(externalEvent);
                const externalEventProcessorConstructor = this.externalEventRegistry.getProcessorForItem(externalEventObject.type);
                const item = await new externalEventProcessorConstructor(this.eventBus, this.parent).execute(externalEventObject);

                if (item) changedItems.addItem(item);

                results.push({
                    externalEventId: externalEventObject.id
                });
            } catch (e: any) {
                this.log.error("There was an error while trying to apply an external event: ", e);

                results.push({
                    externalEventId: externalEvent.id,
                    errorCode: e instanceof CoreError ? e.code : "error.transport.unknown"
                });
            }
        }

        return results;
    }

    private async finalizeExternalEventsSyncRun(externalEventResults: FinalizeSyncRunRequestExternalEventResult[]): Promise<{ newUnsyncedExternalEventsExist: boolean }> {
        if (!this.currentSyncRun) {
            throw new TransportError("There is no active sync run to finalize");
        }

        const { backboneModifications, localModificationIds } = await this.prepareLocalDatawalletModificationsForPush();

        const response = await this.client.finalizeExternalEventSync(this.currentSyncRun.id.toString(), {
            datawalletModifications: backboneModifications,
            externalEventResults: externalEventResults
        });
        if (response.isError) throw response.error;

        await this.deleteUnpushedDatawalletModifications(localModificationIds);

        const oldDatawalletModificationIndex = await this.getLocalDatawalletModificationIndex();
        const newDatawalletModificationIndex = (oldDatawalletModificationIndex ?? -1) + backboneModifications.length;
        await this.updateLocalDatawalletModificationIndex(newDatawalletModificationIndex);

        this.currentSyncRun = undefined;

        return { newUnsyncedExternalEventsExist: response.value.newUnsyncedExternalEventsExist };
    }

    private async finalizeDatawalletVersionUpgradeSyncRun(newDatawalletVersion: number): Promise<void> {
        if (!this.currentSyncRun) {
            throw new TransportError("There is no active sync run to finalize");
        }

        const { backboneModifications, localModificationIds } = await this.prepareLocalDatawalletModificationsForPush();

        const response = await this.client.finalizeDatawalletVersionUpgrade(this.currentSyncRun.id.toString(), {
            newDatawalletVersion,
            datawalletModifications: backboneModifications
        });

        if (response.isError) throw response.error;

        await this.deleteUnpushedDatawalletModifications(localModificationIds);

        const oldDatawalletModificationIndex = await this.getLocalDatawalletModificationIndex();
        const newDatawalletModificationIndex = (oldDatawalletModificationIndex ?? -1) + backboneModifications.length;
        await this.updateLocalDatawalletModificationIndex(newDatawalletModificationIndex);

        this.currentSyncRun = undefined;
    }

    private async getLocalDatawalletModificationIndex() {
        const index = await this.syncInfo.get("localDatawalletModificationIndex");
        return index;
    }

    private async updateLocalDatawalletModificationIndex(newIndex: number) {
        await this.syncInfo.set("localDatawalletModificationIndex", newIndex);
    }

    private async getSyncTimeByName(name: "Datawallet" | "Everything"): Promise<CoreDate | undefined> {
        const time = await this.syncInfo.get(`SyncTime-${name}`);
        const date = time ? CoreDate.from(time) : undefined;
        return date;
    }

    private async setSyncTimeByName(name: "Datawallet" | "Everything") {
        const dateString = CoreDate.utc().toISOString();
        await this.syncInfo.set(`SyncTime-${name}`, dateString);
    }

    public async getLastCompletedSyncTime(): Promise<CoreDate | undefined> {
        return await this.getSyncTimeByName("Everything");
    }

    public async getLastCompletedDatawalletSyncTime(): Promise<CoreDate | undefined> {
        return await this.getSyncTimeByName("Datawallet");
    }

    private async setLastCompletedSyncTime() {
        await this.setSyncTimeByName("Everything");
    }

    private async setLastCompletedDatawalletSyncTime() {
        await this.setSyncTimeByName("Datawallet");
    }

    private newNoMigrationAvailableError(version: number) {
        return new TransportError(`There is no migration available for the datawallet version '${version}'.`);
    }
}

function descending(modification1: BackboneDatawalletModification, modification2: BackboneDatawalletModification) {
    return modification2.index - modification1.index;
}

class LocalSyncRun {
    public constructor(
        public readonly promise: Promise<ChangedItems>,
        public readonly whatToSync: WhatToSync
    ) {}

    public includes(whatToSync: WhatToSync) {
        if (this.whatToSync === "Everything") {
            return true;
        }

        return whatToSync === "OnlyDatawallet";
    }
}
