import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ConsumptionController } from "@nmshd/consumption";
import { AccountController } from "@nmshd/transport";

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
        value.id ??= RuntimeDatabaseSchemaMetadata.DATABASE_SCHEMA_ID;
        return value;
    }

    public static from(value: { version: number }): RuntimeDatabaseSchemaMetadata {
        return this.fromAny(value);
    }
}

export class DatabaseSchemaUpgrader {
    private readonly CURRENT_DATABASE_SCHEMA_VERSION = 1;
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
    }
});
