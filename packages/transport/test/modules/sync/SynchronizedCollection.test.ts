import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreIdHelper } from "@nmshd/core-types";
import { instance, mock, verify } from "ts-mockito";
import { DatawalletModification, DatawalletModificationCategory, DatawalletModificationType, SynchronizedCollection } from "../../../src";
import { ACacheableSynchronizedCollectionItem, CachedACacheableSynchronizedCollectionItem } from "../../testHelpers/ACacheableSynchronizedCollectionItem";
import { ASynchronizedCollectionItem } from "../../testHelpers/ASynchronizedCollectionItem";
import { FakeDatabaseCollection } from "../../testHelpers/FakeDatabaseCollection";
import { objectWith } from "../../testHelpers/PartialObjectMatcher";

describe("SynchronizedCollection", function () {
    let datawalletModificationsCollectionMock: IDatabaseCollection;
    let synchronizedCollection: SynchronizedCollection;
    let parentCollection: IDatabaseCollection;

    beforeEach(function () {
        parentCollection = new FakeDatabaseCollection("synchronizedCollectionName");

        datawalletModificationsCollectionMock = mock<IDatabaseCollection>();

        synchronizedCollection = new SynchronizedCollection(parentCollection, 1, instance(datawalletModificationsCollectionMock));
    });

    test("when inserting a new item, datawallet modifications are created for each category of data", async function () {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalStringProperty: "SomeValue",
            someMetadataStringProperty: "SomeValue",
            someUserdataStringProperty: "SomeValue"
        });

        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: {
                        someTechnicalStringProperty: "SomeValue"
                    }
                })
            )
        ).once();

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payloadCategory: DatawalletModificationCategory.Metadata,
                    payload: {
                        someMetadataStringProperty: "SomeValue"
                    }
                })
            )
        ).once();

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payloadCategory: DatawalletModificationCategory.Userdata,
                    payload: {
                        someUserdataStringProperty: "SomeValue"
                    }
                })
            )
        ).once();
    });

    test("when inserting a new non-cacheable item, no CacheChanged modification is created", async function () {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalStringProperty: "SomeValue"
        });

        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    collection: synchronizedCollection.name,
                    objectIdentifier: newItem.id,
                    type: DatawalletModificationType.CacheChanged
                })
            )
        ).never();
    });

    test("when updating a cacheable item with a changed cache, a CacheChanged modification is created", async function () {
        const item = ACacheableSynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalProperty: "SomeValue",
            cache: { someCacheProperty: "cachedValue" },
            cachedAt: CoreDate.utc()
        });

        await parentCollection.create(item);

        item.cache = CachedACacheableSynchronizedCollectionItem.fromAny({ someCacheProperty: "updatedCachedValue" });

        const itemDoc = await parentCollection.read(item.id.toString());

        await synchronizedCollection.update(itemDoc, item);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    collection: synchronizedCollection.name,
                    objectIdentifier: item.id,
                    type: DatawalletModificationType.CacheChanged
                })
            )
        ).once();
    });

    test("when updating a cacheable item without a changed cache, no CacheChanged modification is created", async function () {
        const item = ACacheableSynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalProperty: "SomeValue",
            cache: { someCacheProperty: "cachedValue" },
            cachedAt: CoreDate.utc()
        });

        await parentCollection.create(item);

        const itemDoc = await parentCollection.read(item.id.toString());

        await synchronizedCollection.update(itemDoc, item);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    collection: synchronizedCollection.name,
                    objectIdentifier: item.id,
                    type: DatawalletModificationType.CacheChanged
                })
            )
        ).never();
    });

    test("when updating a non-cacheable item, no CacheChanged modification is created", async function () {
        const item = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalStringProperty: "SomeValue"
        });

        await parentCollection.create(item);

        const itemDoc = await parentCollection.read(item.id.toString());

        await synchronizedCollection.update(itemDoc, item);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    collection: synchronizedCollection.name,
                    objectIdentifier: item.id,
                    type: DatawalletModificationType.CacheChanged
                })
            )
        ).never();
    });

    test("when a inserting a new item, a datawallet modification for technical data is created", async function () {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someTechnicalStringProperty: "SomeValue",
            someTechnicalNumberProperty: 1,
            someTechnicalBooleanProperty: true
        });

        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payload: {
                        someTechnicalStringProperty: "SomeValue",
                        someTechnicalNumberProperty: 1,
                        someTechnicalBooleanProperty: true
                    }
                })
            )
        ).once();
    });

    test("when a inserting a new item, a datawallet modification for metadata is created", async function () {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someMetadataStringProperty: "SomeValue",
            someMetadataNumberProperty: 1,
            someMetadataBooleanProperty: true
        });

        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payload: {
                        someMetadataStringProperty: "SomeValue",
                        someMetadataNumberProperty: 1,
                        someMetadataBooleanProperty: true
                    }
                })
            )
        ).once();
    });

    test("when inserting a new item, a datawallet modification for userdata is created", async function () {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate(),
            someUserdataStringProperty: "SomeValue",
            someUserdataNumberProperty: 1,
            someUserdataBooleanProperty: true
        });

        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payload: {
                        someUserdataStringProperty: "SomeValue",
                        someUserdataNumberProperty: 1,
                        someUserdataBooleanProperty: true
                    }
                })
            )
        ).once();
    });

    test("when updating an item, should add every property of a category to the payload even if only one was changed", async function () {
        const itemId = await CoreIdHelper.notPrefixed.generate();
        await synchronizedCollection.create(
            ASynchronizedCollectionItem.from({
                id: itemId,
                someTechnicalBooleanProperty: false,
                someTechnicalNumberProperty: 0,
                someTechnicalStringProperty: ""
            })
        );

        const itemDoc = await synchronizedCollection.read(itemId.toString());
        const item = ASynchronizedCollectionItem.from(itemDoc);

        item.someTechnicalBooleanProperty = true;
        await synchronizedCollection.update(itemDoc, item);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: {
                        someTechnicalBooleanProperty: true,
                        someTechnicalNumberProperty: 0,
                        someTechnicalStringProperty: ""
                    }
                })
            )
        ).once();
    });

    test.each([
        {
            payloadCategory: "someTechnicalStringProperty",
            datawalletModificationCategory: DatawalletModificationCategory.TechnicalData
        },
        {
            payloadCategory: "someMetadataStringProperty",
            datawalletModificationCategory: DatawalletModificationCategory.Metadata
        },
        {
            payloadCategory: "someUserdataStringProperty",
            datawalletModificationCategory: DatawalletModificationCategory.Userdata
        }
    ])("$payloadCategory datawallet modifications with type 'Create' have all necessary properties set", async function (params) {
        const newItem = ASynchronizedCollectionItem.from({
            id: await CoreIdHelper.notPrefixed.generate()
        });

        (newItem as any)[params.payloadCategory] = "someValue";
        await synchronizedCollection.create(newItem);

        verify(
            datawalletModificationsCollectionMock.create(
                objectWith<DatawalletModification>({
                    collection: synchronizedCollection.name,
                    objectIdentifier: newItem.id,
                    payloadCategory: params.datawalletModificationCategory,
                    type: DatawalletModificationType.Create
                })
            )
        ).once();
    });
});
