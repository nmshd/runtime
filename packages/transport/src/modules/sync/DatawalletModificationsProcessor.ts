import { IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import _ from "lodash";
import { CoreErrors, TransportError, TransportIds } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ICacheable } from "../../core/ICacheable";
import { CachedIdentityDeletionProcess } from "../accounts/data/CachedIdentityDeletionProcess";
import { IdentityDeletionProcess } from "../accounts/data/IdentityDeletionProcess";
import { IdentityDeletionProcessController } from "../accounts/IdentityDeletionProcessController";
import { FileController } from "../files/FileController";
import { CachedFile } from "../files/local/CachedFile";
import { File } from "../files/local/File";
import { CachedMessage } from "../messages/local/CachedMessage";
import { Message } from "../messages/local/Message";
import { MessageController } from "../messages/MessageController";
import { CachedRelationship } from "../relationships/local/CachedRelationship";
import { Relationship } from "../relationships/local/Relationship";
import { RelationshipsController } from "../relationships/RelationshipsController";
import { CachedRelationshipTemplate } from "../relationshipTemplates/local/CachedRelationshipTemplate";
import { RelationshipTemplate } from "../relationshipTemplates/local/RelationshipTemplate";
import { RelationshipTemplateController } from "../relationshipTemplates/RelationshipTemplateController";
import { CachedToken } from "../tokens/local/CachedToken";
import { Token } from "../tokens/local/Token";
import { TokenController } from "../tokens/TokenController";
import { DatawalletModification, DatawalletModificationType } from "./local/DatawalletModification";

export class DatawalletModificationsProcessor {
    private readonly creates: DatawalletModification[];
    private readonly updates: DatawalletModification[];
    private readonly deletes: DatawalletModification[];
    private readonly cacheChanges: DatawalletModification[];

    public get log(): ILogger {
        return this.logger;
    }

    public constructor(
        modifications: DatawalletModification[],
        private readonly cacheFetcher: CacheFetcher,
        private readonly collectionProvider: IDatabaseCollectionProvider,
        private readonly logger: ILogger
    ) {
        const modificationsGroupedByType = _.groupBy(modifications, (m) => m.type);

        this.creates = modificationsGroupedByType[DatawalletModificationType.Create] ?? [];
        this.updates = modificationsGroupedByType[DatawalletModificationType.Update] ?? [];
        this.deletes = modificationsGroupedByType[DatawalletModificationType.Delete] ?? [];
        this.cacheChanges = modificationsGroupedByType[DatawalletModificationType.CacheChanged] ?? [];
    }

    private readonly collectionsWithCacheableItems: string[] = [
        DbCollectionName.Files,
        DbCollectionName.Messages,
        DbCollectionName.Relationships,
        DbCollectionName.RelationshipTemplates,
        DbCollectionName.Tokens,
        DbCollectionName.IdentityDeletionProcess
    ];

    public async execute(): Promise<void> {
        await this.applyCreates();
        await this.applyUpdates();
        await this.applyDeletes();
        await this.applyCacheChanges();
    }

    private async applyCreates() {
        if (this.creates.length === 0) {
            return;
        }

        const createsGroupedByObjectIdentifier = _.groupBy(this.creates, (c) => c.objectIdentifier);

        for (const objectIdentifier in createsGroupedByObjectIdentifier) {
            const currentCreates = createsGroupedByObjectIdentifier[objectIdentifier];

            const targetCollectionName = currentCreates[0].collection;
            const targetCollection = await this.collectionProvider.getCollection(targetCollectionName);

            let mergedPayload = { id: objectIdentifier };

            for (const create of currentCreates) {
                mergedPayload = { ...mergedPayload, ...create.payload };
            }

            const newObject = Serializable.fromUnknown(mergedPayload);

            const oldDoc = await targetCollection.read(objectIdentifier);
            if (oldDoc) {
                const oldObject = Serializable.fromUnknown(oldDoc);
                const updatedObject = { ...oldObject.toJSON(), ...newObject.toJSON() };
                await targetCollection.update(oldDoc, updatedObject);
            } else {
                await this.simulateCacheChangeForCreate(targetCollectionName, objectIdentifier);
                await targetCollection.create(newObject);
            }
        }
    }

    /**
     * if a collection contains cacheable items, the cache has to be fetched after the item is created on a new device
     * this can only happen after all creates are applied, because the fetching needs properties like the secret key
     */
    private async simulateCacheChangeForCreate(targetCollectionName: string, objectIdentifier: string) {
        if (!this.collectionsWithCacheableItems.includes(targetCollectionName)) return;

        const modification = DatawalletModification.from({
            localId: await TransportIds.datawalletModification.generate(),
            type: DatawalletModificationType.CacheChanged,
            collection: targetCollectionName,
            objectIdentifier: CoreId.from(objectIdentifier)
        });

        this.cacheChanges.push(modification);
    }

    private async applyUpdates() {
        if (this.updates.length === 0) {
            return;
        }

        for (const updateModification of this.updates) {
            const targetCollection = await this.collectionProvider.getCollection(updateModification.collection);
            const oldDoc = await targetCollection.read(updateModification.objectIdentifier.toString());

            if (!oldDoc) {
                throw new TransportError("Document to update was not found.");
            }

            const oldObject = Serializable.fromUnknown(oldDoc);
            const newObject = { ...oldObject.toJSON(), ...updateModification.payload };

            await targetCollection.update(oldDoc, newObject);
        }
    }

    private async applyCacheChanges() {
        if (this.cacheChanges.length === 0) {
            return;
        }

        this.ensureAllItemsAreCacheable();

        const cacheChangesWithoutDeletes = this.cacheChanges.filter((c) => !this.deletes.some((d) => d.objectIdentifier.equals(c.objectIdentifier)));
        const cacheChangesGroupedByCollection = this.groupCacheChangesByCollection(cacheChangesWithoutDeletes);

        const caches = await this.cacheFetcher.fetchCacheFor({
            files: cacheChangesGroupedByCollection.fileIds,
            messages: cacheChangesGroupedByCollection.messageIds,
            relationshipTemplates: cacheChangesGroupedByCollection.relationshipTemplateIds,
            tokens: cacheChangesGroupedByCollection.tokenIds,
            identityDeletionProcesses: cacheChangesGroupedByCollection.identityDeletionProcessIds
        });

        await this.saveNewCaches(caches.files, DbCollectionName.Files, File);
        await this.saveNewCaches(caches.messages, DbCollectionName.Messages, Message);
        await this.saveNewCaches(caches.relationshipTemplates, DbCollectionName.RelationshipTemplates, RelationshipTemplate);
        await this.saveNewCaches(caches.tokens, DbCollectionName.Tokens, Token);
        await this.saveNewCaches(caches.identityDeletionProcesses, DbCollectionName.IdentityDeletionProcess, IdentityDeletionProcess);

        // Need to fetch the cache for relationships after the cache for relationship templates was fetched,
        // because when building the relationship cache, the cache of thecorresponding relationship template
        // is needed
        const relationshipCaches = await this.cacheFetcher.fetchCacheFor({
            relationships: cacheChangesGroupedByCollection.relationshipIds
        });
        await this.saveNewCaches(relationshipCaches.relationships, DbCollectionName.Relationships, Relationship);
    }

    @log()
    private ensureAllItemsAreCacheable() {
        const collections = this.cacheChanges.map((c) => c.collection);
        const uniqueCollections = [...new Set(collections)];
        const collectionsWithUncacheableItems = uniqueCollections.filter((c) => !this.collectionsWithCacheableItems.includes(c));

        if (collectionsWithUncacheableItems.length > 0) {
            throw CoreErrors.datawallet.unsupportedModification("unsupportedCacheChangedModificationCollection", collectionsWithUncacheableItems);
        }
    }

    private groupCacheChangesByCollection(cacheChanges: DatawalletModification[]) {
        const groups = _.groupBy(cacheChanges, (c) => c.collection);

        const fileIds = (groups[DbCollectionName.Files] ?? []).map((m) => m.objectIdentifier);
        const messageIds = (groups[DbCollectionName.Messages] ?? []).map((m) => m.objectIdentifier);
        const relationshipIds = (groups[DbCollectionName.Relationships] ?? []).map((m) => m.objectIdentifier);
        const templateIds = (groups[DbCollectionName.RelationshipTemplates] ?? []).map((m) => m.objectIdentifier);
        const tokenIds = (groups[DbCollectionName.Tokens] ?? []).map((m) => m.objectIdentifier);
        const identityDeletionProcessIds = (groups[DbCollectionName.IdentityDeletionProcess] ?? []).map((m) => m.objectIdentifier);

        return { fileIds, messageIds, relationshipTemplateIds: templateIds, tokenIds, relationshipIds, identityDeletionProcessIds };
    }

    private async saveNewCaches<T extends ICacheable>(caches: FetchCacheOutputItem<any>[], collectionName: DbCollectionName, constructorOfT: new () => T) {
        if (caches.length === 0) return;

        const collection = await this.collectionProvider.getCollection(collectionName);

        await Promise.all(
            caches.map(async (c) => {
                const itemDoc = await collection.read(c.id.toString());
                const item = (constructorOfT as any).from(itemDoc);
                item.setCache(c.cache);
                await collection.update(itemDoc, item);
            })
        );
    }

    private async applyDeletes() {
        if (this.deletes.length === 0) {
            return;
        }

        for (const deleteModification of this.deletes) {
            const targetCollection = await this.collectionProvider.getCollection(deleteModification.collection);
            await targetCollection.delete({ id: deleteModification.objectIdentifier.toString() });
        }
    }
}

export class CacheFetcher {
    public constructor(
        private readonly fileController: FileController,
        private readonly messageController: MessageController,
        private readonly relationshipTemplateController: RelationshipTemplateController,
        private readonly relationshipController: RelationshipsController,
        private readonly tokenController: TokenController,
        private readonly identityDeletionProcessController: IdentityDeletionProcessController
    ) {}

    public async fetchCacheFor(input: FetchCacheInput): Promise<FetchCacheOutput> {
        const caches = await Promise.all([
            this.fetchCaches(this.fileController, input.files),
            this.fetchCaches(this.messageController, input.messages),
            this.fetchCaches(this.relationshipController, input.relationships),
            this.fetchCaches(this.relationshipTemplateController, input.relationshipTemplates),
            this.fetchCaches(this.tokenController, input.tokens),
            this.fetchCaches(this.identityDeletionProcessController, input.identityDeletionProcesses)
        ]);

        const output: FetchCacheOutput = {
            files: caches[0],
            messages: caches[1],
            relationships: caches[2],
            relationshipTemplates: caches[3],
            tokens: caches[4],
            identityDeletionProcesses: caches[5]
        };

        return output;
    }

    private async fetchCaches<TCache>(controller: { fetchCaches(ids: CoreId[]): Promise<FetchCacheOutputItem<TCache>[]> }, ids?: CoreId[]) {
        if (!ids) return [];
        const caches = await controller.fetchCaches(ids);
        return caches;
    }
}

interface FetchCacheInput {
    files?: CoreId[];
    messages?: CoreId[];
    relationships?: CoreId[];
    relationshipTemplates?: CoreId[];
    tokens?: CoreId[];
    identityDeletionProcesses?: CoreId[];
}

interface FetchCacheOutput {
    files: FetchCacheOutputItem<CachedFile>[];
    messages: FetchCacheOutputItem<CachedMessage>[];
    relationships: FetchCacheOutputItem<CachedRelationship>[];
    relationshipTemplates: FetchCacheOutputItem<CachedRelationshipTemplate>[];
    tokens: FetchCacheOutputItem<CachedToken>[];
    identityDeletionProcesses: FetchCacheOutputItem<CachedIdentityDeletionProcess>[];
}

interface FetchCacheOutputItem<TCache> {
    id: CoreId;
    cache: TCache;
}
