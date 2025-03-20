import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { TagClient } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { AttributeTagCollection } from "../attributes";

export class TagsController extends ConsumptionBaseController {
    private tagCollection: IDatabaseCollection;
    private tagClient: TagClient;

    private readonly ETAG_DB_KEY = "etag";
    private readonly CACHE_TIMESTAMP_DB_KEY = "cacheTimestamp";
    private readonly TAG_COLLECTION_DB_KEY = "tagCollection";

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.AttributesController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.tagCollection = await this.parent.accountController.db.getCollection("TagCollection");
        this.tagClient = new TagClient(this.parent.transport.config, this.parent.accountController.authenticator, this.parent.transport.correlator);

        const tagDefinitionCacheExists = await this.tagCollection.exists({ name: this.TAG_COLLECTION_DB_KEY });
        if (!tagDefinitionCacheExists) {
            await this.tagCollection.create({
                name: this.TAG_COLLECTION_DB_KEY,
                value: AttributeTagCollection.from({ supportedLanguages: [], tagsForAttributeValueTypes: {} }).toJSON()
            });
        }
        await this.tagCollection.create({ name: this.ETAG_DB_KEY, value: "" });
        await this.tagCollection.create({ name: this.CACHE_TIMESTAMP_DB_KEY, value: undefined });

        return this;
    }

    private async getTagCollection(): Promise<AttributeTagCollection> {
        const newLocal = await this.tagCollection.findOne({ name: this.TAG_COLLECTION_DB_KEY });
        return AttributeTagCollection.from(newLocal.value);
    }

    private async setTagCollection(tagCollection: AttributeTagCollection): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.TAG_COLLECTION_DB_KEY }), {
            name: this.TAG_COLLECTION_DB_KEY,
            value: tagCollection.toJSON()
        });
    }

    private async getETag(): Promise<string | undefined> {
        return (await this.tagCollection.findOne({ name: this.ETAG_DB_KEY }))?.value;
    }

    private async setETag(etag: string): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.ETAG_DB_KEY }), { name: this.ETAG_DB_KEY, value: etag });
    }

    private async getCacheTimestamp(): Promise<CoreDate | undefined> {
        try {
            return CoreDate.from((await this.tagCollection.findOne({ name: this.CACHE_TIMESTAMP_DB_KEY })).value);
        } catch {
            return undefined;
        }
    }
    private async updateCacheTimestamp(): Promise<void> {
        await this.tagCollection.update(await this.tagCollection.findOne({ name: this.CACHE_TIMESTAMP_DB_KEY }), {
            name: this.CACHE_TIMESTAMP_DB_KEY,
            value: CoreDate.utc().toJSON()
        });
    }
    private async isTagCollectionCacheValid(): Promise<boolean> {
        return (await this.getCacheTimestamp())?.isSameOrAfter(CoreDate.utc().subtract({ minutes: this.parent.accountController.config.tagCacheLifetimeInMinutes })) ?? false;
    }

    public async getAttributeTagCollection(): Promise<AttributeTagCollection> {
        const isCacheValid = await this.isTagCollectionCacheValid();
        if (isCacheValid) {
            return await this.getTagCollection();
        }

        const backboneTagCollection = await this.tagClient.getTagCollection(await this.getETag());
        if (!backboneTagCollection) return await this.getTagCollection();

        await this.setETag(backboneTagCollection.etag ?? "");
        await this.updateCacheTimestamp();
        await this.setTagCollection(AttributeTagCollection.from(backboneTagCollection.value));

        return await this.getTagCollection();
    }
}
