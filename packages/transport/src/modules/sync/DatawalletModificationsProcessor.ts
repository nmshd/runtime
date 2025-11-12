import { IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import * as _ from "lodash";
import { TransportError } from "../../core/index.js";
import { DatawalletModification, DatawalletModificationType } from "./local/DatawalletModification.js";

export class DatawalletModificationsProcessor {
    private readonly deletedObjectIdentifiers: string[] = [];

    private readonly _changedObjectIdentifiers: Set<string> = new Set();
    public get changedObjectIdentifiers(): string[] {
        return Array.from(this._changedObjectIdentifiers);
    }

    public get log(): ILogger {
        return this.logger;
    }

    public constructor(
        private readonly modifications: DatawalletModification[],
        private readonly collectionProvider: IDatabaseCollectionProvider,
        private readonly logger: ILogger
    ) {}

    public async execute(): Promise<void> {
        const modificationsGroupedByObjectIdentifier = _.groupBy(this.modifications, (m) => m.objectIdentifier);

        for (const objectIdentifier in modificationsGroupedByObjectIdentifier) {
            this._changedObjectIdentifiers.add(objectIdentifier);

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
                    default:
                        throw new TransportError(`${modification.type} modifications are not allowed in this context.`);
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
                continue;
            }

            await targetCollection.create({
                id: objectIdentifier,
                ...resultingObject
            });
        }
    }
}
