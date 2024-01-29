import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ConsumptionController, LocalAttribute, LocalRequest } from "@nmshd/consumption";
import { AccountController, DatawalletModification, DatawalletModificationCategory, DatawalletModificationType, TransportIds } from "@nmshd/transport";
import _ from "lodash";

@type("RuntimeDatabaseSchemaMetadata")
class RuntimeDatabaseSchemaMetadata extends Serializable {
    public static readonly DATABASE_SCHEMA_ID = "databaseSchema";

    @serialize()
    @validate({ customValidator: (value: string) => (value === RuntimeDatabaseSchemaMetadata.DATABASE_SCHEMA_ID ? undefined : "Invalid database schema id") })
    public id: string;

    @serialize()
    @validate({ min: 0 })
    public version: number;

    protected static override preFrom(value: any) {
        if (!value.id) value.id = RuntimeDatabaseSchemaMetadata.DATABASE_SCHEMA_ID;
        return value;
    }

    public static from(value: { version: number }): RuntimeDatabaseSchemaMetadata {
        return this.fromAny(value);
    }
}

export class DatabaseSchemaUpgrader {
    private readonly CURRENT_DATABASE_SCHEMA_VERSION = 2;
    private readonly DATABASE_SCHEMA_QUERY = { id: RuntimeDatabaseSchemaMetadata.DATABASE_SCHEMA_ID };

    public constructor(
        private readonly accountController: AccountController,
        private readonly consumptionController: ConsumptionController,
        private readonly loggerFactory: ILoggerFactory
    ) {}

    public async upgradeSchemaVersion(): Promise<void> {
        let version = await this.getVersionFromDB();

        while (version < this.CURRENT_DATABASE_SCHEMA_VERSION) {
            version++;

            const upgradeLogic = UPGRADE_LOGIC[version];
            if (!upgradeLogic) throw new Error(`No upgrade logic found for version '${version}'`);

            await upgradeLogic(this.accountController, this.consumptionController, this.loggerFactory.getLogger(`DatabaseSchemaUpgrader.v${version}`));
            await this.writeVersionToDB(version);
        }
    }

    private async getVersionFromDB(): Promise<number> {
        const metaCollection = await this.accountController.db.getCollection("meta");
        const doc = await metaCollection.findOne(this.DATABASE_SCHEMA_QUERY);

        // If no version is found, assume version 0
        if (!doc) return 0;

        const metadata = RuntimeDatabaseSchemaMetadata.from(doc);
        return metadata.version;
    }

    private async writeVersionToDB(version: number): Promise<void> {
        const metaCollection = await this.accountController.db.getCollection("meta");

        const metadata = RuntimeDatabaseSchemaMetadata.from({ version });

        const oldDoc = await metaCollection.findOne(this.DATABASE_SCHEMA_QUERY);
        if (oldDoc) {
            await metaCollection.update(oldDoc, metadata);
        } else {
            await metaCollection.create(metadata);
        }
    }
}

type UpgradeLogicFunction = (accountController: AccountController, consumptionController: ConsumptionController, logger: ILogger) => void | Promise<void>;
export const UPGRADE_LOGIC = Object.freeze<Record<number, UpgradeLogicFunction | undefined>>({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    1: (accountController, _, logger) => {
        logger.info(`Upgrading database schema to version 1 for account '${accountController.identity.address.toString()}'`);
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    2: async (accountController, _, logger) => {
        logger.info(`Upgrading database schema to version 2 for account '${accountController.identity.address.toString()}'`);

        if (!accountController.config.datawalletEnabled) return;

        const datawalletModifications = accountController["unpushedDatawalletModifications"] as IDatabaseCollection;
        const datawalletVersion = accountController.config.supportedDatawalletVersion;

        const requestsCollection = await accountController.getSynchronizedCollection("Requests");
        const requestDocs = await requestsCollection.find({});

        for (const requestDoc of requestDocs) {
            logger.info(`Processing Request '${requestDoc.id}'`);

            let request: LocalRequest;

            try {
                request = LocalRequest.from(requestDoc);
            } catch (e) {
                logger.error(`Failed to parse Request '${requestDoc.id}'`, e);
                continue;
            }

            const objectIdentifier = request.id;

            await datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: "Requests",
                    objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: extractPayloadFromObject(request, request.technicalProperties),
                    datawalletVersion
                })
            );

            await datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Create,
                    collection: "Requests",
                    objectIdentifier,
                    payloadCategory: DatawalletModificationCategory.Userdata,
                    payload: extractPayloadFromObject(request, request.userdataProperties),
                    datawalletVersion
                })
            );

            logger.info(`Successfully created datawallet modifications for Request '${requestDoc.id}'.`);
        }

        const attributesCollection = await accountController.getSynchronizedCollection("Attributes");
        const attributeDocs = await attributesCollection.find({});

        for (const attributeDoc of attributeDocs) {
            logger.info(`Processing Attribute '${attributeDoc.id}'`);

            let attribute: LocalAttribute;

            try {
                attribute = LocalAttribute.from(attributeDoc);
            } catch (e) {
                logger.error(`Failed to parse Attribute '${attributeDoc.id}'`, e);
                continue;
            }

            const technicalModificationPayload = extractPayloadFromObject(attribute, attribute.technicalProperties);
            if (!("succeededBy" in technicalModificationPayload) && !("shareInfo" in technicalModificationPayload) && !("parentId" in technicalModificationPayload)) {
                logger.info(`Attribute '${attributeDoc.id}' does not contain any new technical properties. Skipping.`);
                continue;
            }

            await datawalletModifications.create(
                DatawalletModification.from({
                    localId: await TransportIds.datawalletModification.generate(),
                    type: DatawalletModificationType.Update,
                    collection: "Attributes",
                    objectIdentifier: attribute.id,
                    payloadCategory: DatawalletModificationCategory.TechnicalData,
                    payload: technicalModificationPayload,
                    datawalletVersion
                })
            );

            logger.info(`Successfully created a datawallet modification for Attribute '${attributeDoc.id}'.`);
        }

        await accountController.syncDatawallet();
    }
});

function extractPayloadFromObject(serializableObject: Serializable, properties: string[]): any {
    const object = serializableObject.toJSON();
    const predicate = (value: any, key: string) => value !== undefined && properties.includes(key);

    return _.pickBy<any>(object, predicate);
}
