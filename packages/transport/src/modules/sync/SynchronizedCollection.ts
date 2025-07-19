import { DatabaseType, IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import jsonpatch from "fast-json-patch";
import _ from "lodash";
import { nameof } from "ts-simple-nameof";
import { CoreSynchronizable, ICoreSynchronizable } from "../../core/CoreSynchronizable";
import { ICacheable } from "../../core/ICacheable";
import { TransportIds } from "../../core/TransportIds";
import { DatawalletModification, DatawalletModificationCategory, DatawalletModificationType } from "../sync/local/DatawalletModification";

export class SynchronizedCollection implements IDatabaseCollection {
    public readonly name: string;
    public readonly databaseType: DatabaseType;

    public constructor(
        private readonly parent: IDatabaseCollection,
        private readonly datawalletVersion: number,
        private readonly datawalletModifications?: IDatabaseCollection
    ) {
        this.name = parent.name;
        this.databaseType = parent.databaseType;
    }

    public async create(newObject: CoreSynchronizable): Promise<any> {
        const newObjectJson = newObject.toJSON();

        if (!this.datawalletModifications) {
            return await this.parent.create(newObject);
        }

        const technicalModificationPayload = _.pickBy<any>(newObjectJson, (value, key) => value !== undefined && newObject.technicalProperties.includes(key));
        const contentModificationPayload = _.pickBy<any>(newObjectJson, (value, key) => value !== undefined && newObject.contentProperties.includes(key));
        const metadataModificationPayload = _.pickBy<any>(newObjectJson, (value, key) => value !== undefined && newObject.metadataProperties.includes(key));
        const userdataModificationPayload = _.pickBy<any>(newObjectJson, (value, key) => value !== undefined && newObject.userdataProperties.includes(key));
        const objectIdentifier = (newObject as any)["id"];

        if (Object.getOwnPropertyNames(technicalModificationPayload).length !== 0) {
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: technicalModificationPayload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (Object.getOwnPropertyNames(contentModificationPayload).length !== 0) {
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Content,
                    payload: contentModificationPayload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (Object.getOwnPropertyNames(metadataModificationPayload).length !== 0) {
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Metadata,
                    payload: metadataModificationPayload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (Object.getOwnPropertyNames(userdataModificationPayload).length !== 0) {
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Userdata,
                    payload: userdataModificationPayload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        await this.parent.create(newObject);
    }

    public async read(id: string): Promise<any> {
        return await this.parent.read(id);
    }

    public async update(oldDoc: any, newObject: CoreSynchronizable): Promise<any> {
        const oldObject = Serializable.fromUnknown(oldDoc);

        const newObjectJson = newObject.toJSON();

        if (typeof globalThis.process === "object" && globalThis.process.env.CI) {
            const databaseObject = Serializable.fromUnknown(await this.parent.read(newObject.id.toString()));

            const readDiff = jsonpatch.compare(databaseObject.toJSON(), oldObject.toJSON());
            if (readDiff.length > 0) {
                // eslint-disable-next-line no-console
                console.error(`
The data that is currently updated got modified between it initial reading and this update.
This will lead to an data loss and inconsistency.
Here is the diff of the data:
${JSON.stringify(readDiff, null, 2)}
Old Object from Database:
${JSON.stringify(oldDoc, null, 2)}
Object in Database:
${JSON.stringify(databaseObject, null, 2)}


Stack:
${new Error().stack}`);
            }
        }

        if (!this.datawalletModifications) {
            return await this.parent.update(oldDoc, newObject);
        }

        const diff = jsonpatch.compare(oldObject.toJSON(), newObjectJson);

        const changedRootProperties: string[] = [];
        for (const diffItem of diff) {
            const splittedPath = diffItem.path.split("/");
            const rootProperty = splittedPath.find((p) => p)!;
            changedRootProperties.push(rootProperty);
        }

        const haveTechnicalPropertiesChanged = _.intersection(newObject.technicalProperties, changedRootProperties).length !== 0;
        const haveContentPropertiesChanged = _.intersection(newObject.contentProperties, changedRootProperties).length !== 0;
        const haveMetadataPropertiesChanged = _.intersection(newObject.metadataProperties, changedRootProperties).length !== 0;
        const haveUserdataPropertiesChanged = _.intersection(newObject.userdataProperties, changedRootProperties).length !== 0;
        const hasCacheChanged = changedRootProperties.some((p) => p === nameof<ICacheable>((c) => c.cache));

        const objectIdentifier = (newObject as any)["id"];

        if (haveTechnicalPropertiesChanged) {
            const payload = _.pick(newObjectJson, newObject.technicalProperties);
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Update,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: payload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (haveContentPropertiesChanged) {
            const payload = _.pick(newObjectJson, newObject.contentProperties);
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Update,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Content,
                    payload: payload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (haveMetadataPropertiesChanged) {
            const payload = _.pick(newObjectJson, newObject.metadataProperties);
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Update,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Metadata,
                    payload: payload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (haveUserdataPropertiesChanged) {
            const payload = _.pick(newObjectJson, newObject.userdataProperties);
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Update,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Userdata,
                    payload: payload,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        if (hasCacheChanged) {
            await this.datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.CacheChanged,
                    collection: this.name,
                    objectIdentifier: objectIdentifier,
                    datawalletVersion: this.datawalletVersion
                })
            );
        }

        return await this.parent.update(oldDoc, newObject);
    }

    public async delete(object: CoreSynchronizable | ICoreSynchronizable): Promise<boolean> {
        if (!this.datawalletModifications) {
            return await this.parent.delete({ id: object.id.toString() });
        }

        await this.datawalletModifications.create(
            DatawalletModification.from({
                localId: await TransportIds.datawalletModification.generate(),
                type: DatawalletModificationType.Delete,
                collection: this.name,
                objectIdentifier: object.id,
                datawalletVersion: this.datawalletVersion
            })
        );
        return await this.parent.delete({ id: object.id.toString() });
    }

    public async list(): Promise<any[]> {
        return await this.parent.list();
    }

    public async find(query?: any): Promise<any[]> {
        return await this.parent.find(query);
    }

    public async count(query?: any): Promise<number> {
        return await this.parent.count(query);
    }
    public async exists(query?: any): Promise<boolean> {
        return await this.parent.exists(query);
    }

    public async findOne(object?: any): Promise<any> {
        return await this.parent.findOne(object);
    }
}
