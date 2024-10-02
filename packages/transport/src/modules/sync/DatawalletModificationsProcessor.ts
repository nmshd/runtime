import { IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import _ from "lodash";
import { TransportCoreErrors, TransportError, TransportIds } from "../../core";
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
    private readonly modificationsWithoutCacheChanges: DatawalletModification[];
    private readonly cacheChanges: DatawalletModification[];
    private readonly deletedObjectIdentifiers: string[] = [];

    public get log(): ILogger {
        return this.logger;
    }

    public constructor(
        modifications: DatawalletModification[],
        private readonly cacheFetcher: CacheFetcher,
        private readonly collectionProvider: IDatabaseCollectionProvider,
        private readonly logger: ILogger
    ) {
        this.modificationsWithoutCacheChanges = modifications.filter((m) => m.type !== DatawalletModificationType.CacheChanged);
        this.cacheChanges = modifications.filter((m) => m.type === DatawalletModificationType.CacheChanged);
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
        await this.applyModifications();
        await this.applyCacheChanges();
    }

    private async applyModifications() {
        const modificationsGroupedByObjectIdentifier = _.groupBy(this.modificationsWithoutCacheChanges, (m) => m.objectIdentifier);

        for (const objectIdentifier in modificationsGroupedByObjectIdentifier) {
            const currentModifications = modificationsGroupedByObjectIdentifier[objectIdentifier];

            const targetCollectionName = currentModifications[0].collection;
            const targetCollection = await this.collectionProvider.getCollection(targetCollectionName);

            const lastModification = currentModifications.at(-1)!;
            if (lastModification.type === DatawalletModificationType.Delete) {
                await targetCollection.delete({ id: objectIdentifier });
                this.deletedObjectIdentifiers.push(objectIdentifier);

                continue;
            }

            let resultingObject: any = {};
            for (const modification of currentModifications) {
                switch (modification.type) {
                    case DatawalletModificationType.Create:
                    case DatawalletModificationType.Update:
                        resultingObject = { ...resultingObject, ...modification.payload };
                        break;
                    case DatawalletModificationType.Delete:
                        resultingObject = {};
                        break;
                    case DatawalletModificationType.CacheChanged:
                        throw new TransportError("CacheChanged modifications are not allowed in this context.");
                }
            }

            const oldDoc = await targetCollection.read(objectIdentifier);
            if (oldDoc) {
                const oldObject = Serializable.fromUnknown(oldDoc);

                const newObject = {
                    ...oldObject.toJSON(),
                    ...resultingObject
                };

                await targetCollection.update(oldDoc, newObject);
            } else {
                await this.simulateCacheChangeForCreate(targetCollectionName, objectIdentifier);
                await targetCollection.create({
                    id: objectIdentifier,
                    ...resultingObject
                });
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

    private async applyCacheChanges() {
        if (this.cacheChanges.length === 0) {
            return;
        }

        this.ensureAllItemsAreCacheable();

        const cacheChangesWithoutDeletes = this.cacheChanges.filter((c) => !this.deletedObjectIdentifiers.some((d) => c.objectIdentifier.equals(d)));
        const cacheChangesGroupedByCollection = this.groupCacheChangesByCollection(cacheChangesWithoutDeletes);

        const caches = await this.cacheFetcher.fetchCacheFor({
            files: cacheChangesGroupedByCollection.fileIds,
            relationshipTemplates: cacheChangesGroupedByCollection.relationshipTemplateIds,
            tokens: cacheChangesGroupedByCollection.tokenIds,
            identityDeletionProcesses: cacheChangesGroupedByCollection.identityDeletionProcessIds
        });

        await this.saveNewCaches(caches.files, DbCollectionName.Files, File);
        await this.saveNewCaches(caches.relationshipTemplates, DbCollectionName.RelationshipTemplates, RelationshipTemplate);
        await this.saveNewCaches(caches.tokens, DbCollectionName.Tokens, Token);
        await this.saveNewCaches(caches.identityDeletionProcesses, DbCollectionName.IdentityDeletionProcess, IdentityDeletionProcess);

        // Need to fetch the cache for relationships after the cache for relationship templates was fetched, because when building the relationship cache, the cache of thecorresponding relationship template is needed
        const relationshipCaches = await this.cacheFetcher.fetchCacheFor({ relationships: cacheChangesGroupedByCollection.relationshipIds });
        await this.saveNewCaches(relationshipCaches.relationships, DbCollectionName.Relationships, Relationship);

        // Need to fetch the cache for messages after the cache for relationships was fetched, because when building the message cache, the cache of thecorresponding relationship is needed
        const messageCaches = await this.cacheFetcher.fetchCacheFor({ messages: cacheChangesGroupedByCollection.messageIds });
        await this.saveNewCaches(messageCaches.messages, DbCollectionName.Messages, Message);
    }

    @log()
    private ensureAllItemsAreCacheable() {
        const collections = this.cacheChanges.map((c) => c.collection);
        const uniqueCollections = [...new Set(collections)];
        const collectionsWithUncacheableItems = uniqueCollections.filter((c) => !this.collectionsWithCacheableItems.includes(c));

        if (collectionsWithUncacheableItems.length > 0) {
            throw TransportCoreErrors.datawallet.unsupportedModification("unsupportedCacheChangedModificationCollection", collectionsWithUncacheableItems);
        }
    }

    private groupCacheChangesByCollection(cacheChanges: DatawalletModification[]) {
        const groups = _.groupBy(cacheChanges, (c) => c.collection);

        const fileIds = (groups[DbCollectionName.Files] ?? []).map((m) => m.objectIdentifier);
        const messageIds = (groups[DbCollectionName.Messages] ?? []).map((m) => m.objectIdentifier);
        const relationshipIds = (groups[DbCollectionName.Relationships] ?? []).map((m) => m.objectIdentifier);
        const relationshipTemplateIds = (groups[DbCollectionName.RelationshipTemplates] ?? []).map((m) => m.objectIdentifier);
        const tokenIds = (groups[DbCollectionName.Tokens] ?? []).map((m) => m.objectIdentifier);
        const identityDeletionProcessIds = (groups[DbCollectionName.IdentityDeletionProcess] ?? []).map((m) => m.objectIdentifier);

        return { fileIds, messageIds, relationshipTemplateIds, tokenIds, relationshipIds, identityDeletionProcessIds };
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
