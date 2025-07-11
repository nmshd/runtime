import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { EventEmitter2EventBus } from "@js-soft/ts-utils";
import { ConsumptionController, LocalAttribute, LocalRequest } from "@nmshd/consumption";
import { DisplayName, IdentityAttribute } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { LocalRequestStatus } from "../../src";
import { DatabaseSchemaUpgrader, UPGRADE_LOGIC } from "../../src/DatabaseSchemaUpgrader";
import { RuntimeServiceProvider, TestRequestItem } from "../lib";

const loggerFactory = new NodeLoggerFactory({
    appenders: {
        consoleAppender: {
            type: "stdout",
            layout: { type: "pattern", pattern: "%[[%d] [%p] %c - %m%]" }
        },
        console: {
            type: "logLevelFilter",
            level: "ERROR",
            appender: "consoleAppender"
        }
    },

    categories: {
        default: {
            appenders: ["console"],
            level: "TRACE"
        }
    }
});
const testLogger = loggerFactory.getLogger("DatabaseSchemaUpgrader.test");

let databaseConnection: MongoDbConnection | LokiJsConnection;
let accountController: AccountController;
let consumptionController: ConsumptionController;

beforeAll(async () => {
    if (process.env.USE_LOKIJS === "true") {
        databaseConnection = new LokiJsConnection("./db");
    } else {
        databaseConnection = new MongoDbConnection(process.env.CONNECTION_STRING!);
        await databaseConnection.connect();
    }

    const transport = new Transport(
        { ...RuntimeServiceProvider.defaultConfig.transportLibrary, supportedIdentityVersion: 1, datawalletEnabled: true },
        new EventEmitter2EventBus(() => {
            // noop
        }),
        loggerFactory
    );

    const randomAccountName = Math.random().toString(36).substring(7);
    const db = await databaseConnection.getDatabase(`acc-${randomAccountName}`);

    accountController = await new AccountController(transport, db, transport.config).init();
    consumptionController = await new ConsumptionController(transport, accountController, { setDefaultRepositoryAttributes: false }).init();
}, 30000);

afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    await accountController?.close().catch((e) => testLogger.error(e));
    await databaseConnection.close();
});

describe("DatabaseSchemaUpgrader", () => {
    test("should write the current version to the database during startup", async () => {
        await new DatabaseSchemaUpgrader(accountController, consumptionController, loggerFactory).upgradeSchemaVersion();

        const metaCollection = await accountController.db.getCollection("meta");
        const doc = await metaCollection.findOne({ id: "databaseSchema" });

        expect(doc).toBeDefined();
        expect(doc.version).toBeGreaterThan(0);
    });

    describe("migration from version 1 to 2", () => {
        let unpushedDatawalletModifications: IDatabaseCollection;
        const v2UpgradeFunction = UPGRADE_LOGIC[2]!;

        beforeAll(() => {
            unpushedDatawalletModifications = accountController["unpushedDatawalletModifications"] as IDatabaseCollection;
        });

        beforeEach(async () => {
            jest.clearAllMocks();

            const deleteAllDocuments = async (collection: IDatabaseCollection, identifier = "id") => {
                const documents = await collection.find();
                for (const document of documents) await collection.delete({ [identifier]: document[identifier] });
            };

            await deleteAllDocuments(unpushedDatawalletModifications, "localId");
            await deleteAllDocuments(await accountController.db.getCollection("Requests"));
            await deleteAllDocuments(await accountController.db.getCollection("Attributes"));

            jest.spyOn(accountController, "syncDatawallet").mockImplementation();
        });

        test("should not create datawallet modifications or sync when no requests or attributes exist", async () => {
            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(0);
        });

        test("should create datawallet modifications and sync when a request exist", async () => {
            const requestsCollection = await accountController.db.getCollection("Requests");
            await requestsCollection.create(
                LocalRequest.from({
                    id: CoreId.from("REQ123"),
                    content: { items: [TestRequestItem.from({ mustBeAccepted: false })] },
                    isOwn: true,
                    createdAt: CoreDate.utc(),
                    peer: CoreAddress.from(""),
                    status: LocalRequestStatus.Draft,
                    statusLog: []
                })
            );

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(2);

            const modifications = await unpushedDatawalletModifications.find({});
            expect(modifications).toHaveLength(2);

            const technicalDataModification = modifications[0];
            expect(technicalDataModification.payloadCategory).toBe("TechnicalData");
            expect(technicalDataModification.type).toBe("Create");
            expect(Object.keys(technicalDataModification.payload)).toStrictEqual(["@type", "createdAt", "isOwn", "peer", "status", "statusLog"]);

            const userDataModification = modifications[1];
            expect(userDataModification.payloadCategory).toBe("Userdata");
            expect(userDataModification.type).toBe("Create");
            expect(Object.keys(userDataModification.payload)).toStrictEqual(["content"]);
        });

        test("should create datawallet modifications and sync when two requests exist", async () => {
            const requestsCollection = await accountController.db.getCollection("Requests");
            await requestsCollection.create(
                LocalRequest.from({
                    id: CoreId.from("REQ123"),
                    content: { items: [TestRequestItem.from({ mustBeAccepted: false })] },
                    isOwn: true,
                    createdAt: CoreDate.utc(),
                    peer: CoreAddress.from(""),
                    status: LocalRequestStatus.Draft,
                    statusLog: []
                })
            );

            await requestsCollection.create(
                LocalRequest.from({
                    id: CoreId.from("REQ456"),
                    content: { items: [TestRequestItem.from({ mustBeAccepted: false })] },
                    isOwn: true,
                    createdAt: CoreDate.utc(),
                    peer: CoreAddress.from(""),
                    status: LocalRequestStatus.Draft,
                    statusLog: []
                })
            );

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(4);
        });

        test("should create a datawallet modification and sync when an attribute exists", async () => {
            const attributesCollection = await accountController.db.getCollection("Attributes");
            await attributesCollection.create(
                LocalAttribute.from({
                    id: CoreId.from("ATT123"),
                    content: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: DisplayName.from("Test")
                    }),
                    createdAt: CoreDate.utc(),
                    shareInfo: {
                        peer: CoreAddress.from(""),
                        requestReference: CoreId.from("REQ123")
                    }
                })
            );

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();

            const modifications = await unpushedDatawalletModifications.find({});
            expect(modifications).toHaveLength(1);

            const modification = modifications[0];

            expect(modification.payloadCategory).toBe("TechnicalData");
            expect(modification.type).toBe("Update");
            expect(Object.keys(modification.payload)).toStrictEqual(["@type", "createdAt", "shareInfo"]);
        });

        test("should create no datawallet modification when an attribute exists but has no new technical properties", async () => {
            const attributesCollection = await accountController.db.getCollection("Attributes");
            await attributesCollection.create(
                LocalAttribute.from({
                    id: CoreId.from("ATT123"),
                    content: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: DisplayName.from("Test")
                    }),
                    createdAt: CoreDate.utc()
                })
            );

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(0);
        });

        test("should create a datawallet modification and sync when two attributes exists", async () => {
            const attributesCollection = await accountController.db.getCollection("Attributes");
            await attributesCollection.create(
                LocalAttribute.from({
                    id: CoreId.from("ATT123"),
                    content: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: DisplayName.from("Test")
                    }),
                    createdAt: CoreDate.utc(),
                    shareInfo: {
                        peer: CoreAddress.from(""),
                        requestReference: CoreId.from("REQ123")
                    }
                })
            );

            await attributesCollection.create(
                LocalAttribute.from({
                    id: CoreId.from("ATT456"),
                    content: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: DisplayName.from("Test")
                    }),
                    createdAt: CoreDate.utc(),
                    shareInfo: {
                        peer: CoreAddress.from(""),
                        requestReference: CoreId.from("REQ123")
                    }
                })
            );

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(2);
        });

        test("should not create datawallet modifications or sync when the datawallet is disabled", async () => {
            accountController.config.datawalletEnabled = false;

            await v2UpgradeFunction(accountController, undefined as any as ConsumptionController, testLogger);

            expect(accountController.syncDatawallet).not.toHaveBeenCalled();
            expect(await unpushedDatawalletModifications.count()).toBe(0);

            accountController.config.datawalletEnabled = true;
        });
    });
});
