/* eslint-disable jest/no-standalone-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { EventEmitter2EventBus, sleep } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import fs from "fs";
import { DurationLike } from "luxon";
import path from "path";
import { GenericContainer, Wait } from "testcontainers";
import { LogLevel } from "typescript-logging";
import {
    AccountController,
    ChangedItems,
    DependencyOverrides,
    DeviceSharedSecret,
    File,
    IChangedItems,
    IConfigOverwrite,
    ICorrelator,
    IdentityDeletionProcess,
    IdentityUtil,
    ISendFileParameters,
    Message,
    Relationship,
    RelationshipStatus,
    RelationshipTemplate,
    RequestError,
    TokenContentRelationshipTemplate,
    TokenReference,
    Transport,
    TransportLoggerFactory
} from "../../src";

export class TestUtil {
    private static readonly fatalLogger = new SimpleLoggerFactory(LogLevel.Fatal);
    private static oldLogger: ILoggerFactory;
    public static loggerFactory = new NodeLoggerFactory({
        appenders: {
            consoleAppender: {
                type: "stdout",
                layout: { type: "pattern", pattern: "%[[%p] %c - %m%]" }
            },
            console: {
                type: "logLevelFilter",
                level: "Warn",
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

    public static tempDateThreshold: DurationLike = { seconds: 30 };

    public static useFatalLoggerFactory(): void {
        this.oldLogger = (TransportLoggerFactory as any).instance;
        TransportLoggerFactory.init(this.fatalLogger);
    }

    public static useTestLoggerFactory(): void {
        TransportLoggerFactory.init(this.oldLogger);
    }

    public static expectThrows(method: Function | Promise<any>, errorMessageRegexp: RegExp | string): void {
        let error: Error | undefined;
        try {
            if (typeof method === "function") {
                method();
            }
        } catch (err: any) {
            error = err;
        }
        expect(error).toBeInstanceOf(Error);
        if (errorMessageRegexp) {
            expect(error!.message).toMatch(new RegExp(errorMessageRegexp));
        }
    }

    public static async syncParallel(
        device1: AccountController,
        device2: AccountController
    ): Promise<{ winner: AccountController; looser: AccountController; thrownError: Error }> {
        let syncWinner: AccountController | undefined;
        let syncLooser: AccountController | undefined;
        let thrownError: Error | undefined;

        const syncPromises = [
            device1
                .syncEverything()
                .then(() => {
                    syncWinner = device1;
                })
                .catch((e) => {
                    syncLooser = device1;
                    thrownError = e;
                }),
            device2
                .syncEverything()
                .then(() => {
                    syncWinner = device2;
                })
                .catch((e) => {
                    syncLooser = device2;
                    thrownError = e;
                })
        ];

        await Promise.all(syncPromises);

        if (!syncWinner) throw new Error("There is no winner");
        if (!syncLooser) throw new Error("There is no looser");
        if (!thrownError) throw new Error("There was no error thrown");

        return { winner: syncWinner, looser: syncLooser, thrownError: thrownError };
    }

    public static async expectThrowsRequestErrorAsync(promise: Promise<any>, errorMessageRegexp?: RegExp | string, status?: number): Promise<void> {
        let error: Error | undefined;

        try {
            await promise;
        } catch (e) {
            error = e as Error;
        }

        expect(error).toBeInstanceOf(RequestError);

        const requestError = error as RequestError;

        if (errorMessageRegexp) {
            expect(requestError.message).toMatch(new RegExp(errorMessageRegexp));
        }

        if (status) {
            expect(requestError.status).toStrictEqual(status);
        }
    }

    public static async createDatabaseConnection(): Promise<IDatabaseConnection> {
        let dbConnection;
        if (process.env.USE_LOKIJS === "true") {
            dbConnection = LokiJsConnection.inMemory();
        } else {
            dbConnection = new MongoDbConnection(process.env.CONNECTION_STRING!);
            await dbConnection.connect();
        }
        return dbConnection;
    }

    public static createTransport(configOverwrite: Partial<IConfigOverwrite> = {}, correlator?: ICorrelator): Transport {
        const eventBus = TestUtil.createEventBus();

        const config = TestUtil.createConfig();

        return new Transport({ ...config, ...configOverwrite }, eventBus, TestUtil.loggerFactory, correlator);
    }

    public static createEventBus(): EventEmitter2EventBus {
        return new EventEmitter2EventBus(() => {
            // ignore errors
        });
    }

    public static createConfig(): IConfigOverwrite {
        const notDefinedEnvironmentVariables = ["NMSHD_TEST_BASEURL", "NMSHD_TEST_CLIENTID", "NMSHD_TEST_CLIENTSECRET"].filter((env) => !process.env[env]);

        if (notDefinedEnvironmentVariables.length > 0) {
            throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`);
        }

        return {
            baseUrl: globalThis.process.env.NMSHD_TEST_BASEURL!,
            platformClientId: globalThis.process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: globalThis.process.env.NMSHD_TEST_CLIENTSECRET!,
            addressGenerationHostnameOverride: globalThis.process.env.NMSHD_TEST_ADDRESS_GENERATION_HOSTNAME_OVERRIDE,
            debug: true,
            supportedIdentityVersion: 1
        };
    }

    public static async createAccount(transport: Transport, connection: IDatabaseConnection, dependencyOverrides?: DependencyOverrides): Promise<AccountController> {
        const randomAccountName = Math.random().toString(36).substring(7);
        const db = await connection.getDatabase(`acc-${randomAccountName}`);

        const accountController = new AccountController(transport, db, transport.config, dependencyOverrides);

        await accountController.init();

        return accountController;
    }

    public static async createIdentityWithOneDevice(connection: IDatabaseConnection, config: Partial<IConfigOverwrite>): Promise<AccountController> {
        const transport = TestUtil.createTransport(config);

        await transport.init();
        const deviceAccount = await TestUtil.createAccount(transport, connection);
        return deviceAccount;
    }

    public static async createIdentityWithTwoDevices(
        connection: IDatabaseConnection,
        config: Partial<IConfigOverwrite>
    ): Promise<{
        device1: AccountController;
        device2: AccountController;
    }> {
        // Create Device1 Controller    transport = TestUtil.createTransport();
        const transport = TestUtil.createTransport(config);

        await transport.init();
        const device1Account = await TestUtil.createAccount(transport, connection);

        // Prepare Device2
        const device2 = await device1Account.devices.sendDevice({ name: "Device2" });
        const sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(device2, 1, true);
        await device1Account.syncDatawallet();

        // Create Device2 Controller
        const device2Account = await TestUtil.onboardDevice(transport, connection, sharedSecret);

        await device1Account.syncEverything();
        await device2Account.syncEverything();

        return { device1: device1Account, device2: device2Account };
    }

    public static async createIdentityWithNDevices(n: number, connection: IDatabaseConnection, config: Partial<IConfigOverwrite>): Promise<AccountController[]> {
        const transport = TestUtil.createTransport(config);
        await transport.init();
        const device1Account = await TestUtil.createAccount(transport, connection);

        const devices = [device1Account];

        for (let i = 0; i < n - 1; i++) {
            const device2 = await device1Account.devices.sendDevice({ name: `Device${i + 2}` });
            const sharedSecret = await device1Account.activeDevice.secrets.createDeviceSharedSecret(device2, n + 1, true);
            await device1Account.syncDatawallet();

            // Create Device2 Controller
            const device2Account = await TestUtil.onboardDevice(transport, connection, sharedSecret);

            devices.push(device2Account);
        }

        for (const device of devices) {
            await device.syncDatawallet();
        }

        return devices;
    }

    public static async provideAccounts(transport: Transport, connection: IDatabaseConnection, count: number): Promise<AccountController[]> {
        const accounts: AccountController[] = [];

        for (let i = 0; i < count; i++) {
            accounts.push(await this.createAccount(transport, connection));
        }

        return accounts;
    }

    public static defineMigrationToVersion(version: number, account: AccountController): void {
        // @ts-expect-error
        account.synchronization.deviceMigrations[`v${version}`] = () => {
            /* no migration logic */
        };

        // @ts-expect-error
        account.synchronization.identityMigrations[`v${version}`] = () => {
            /* no migration logic */
        };
    }

    public static async onboardDevice(transport: Transport, connection: IDatabaseConnection, deviceSharedSecret: DeviceSharedSecret): Promise<AccountController> {
        const randomId = Math.random().toString(36).substring(7);
        const db = await connection.getDatabase(`acc-${randomId}`);
        const accountController = new AccountController(transport, db, transport.config);
        await accountController.init(deviceSharedSecret);

        return accountController;
    }

    public static async exchangeTemplate(from: AccountController, to: AccountController): Promise<RelationshipTemplate> {
        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateReference = templateFrom.toRelationshipTemplateReference(from.config.baseUrl);
        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);

        return templateTo;
    }

    public static async addRejectedRelationship(from: AccountController, to: AccountController): Promise<Relationship> {
        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const reference = templateFrom.toRelationshipTemplateReference(from.config.baseUrl);
        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);

        await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: {
                mycontent: "request"
            }
        });

        // Reject relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];
        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const rejectedRelationshipFromSelf = await from.relationships.reject(pendingRelationship.id);
        expect(rejectedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Rejected);

        // Get rejected relationship
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const rejectedRelationshipPeer = syncedRelationshipsPeer[0];
        expect(rejectedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Rejected);

        return rejectedRelationshipFromSelf;
    }

    public static async addPendingRelationship(from: AccountController, to: AccountController, template?: RelationshipTemplate): Promise<Relationship> {
        const templateFrom =
            template ??
            (await from.relationshipTemplates.sendRelationshipTemplate({
                content: {
                    mycontent: "template"
                },
                expiresAt: CoreDate.utc().add({ minutes: 5 }),
                maxNumberOfAllocations: 1
            }));

        const templateReference = templateFrom.toRelationshipTemplateReference(from.config.baseUrl);
        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);

        await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: {
                mycontent: "request"
            }
        });

        const syncedRelationshipsFromSelf = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationshipsFromSelf).toHaveLength(1);
        const pendingRelationshipFromSelf = syncedRelationshipsFromSelf[0];
        expect(pendingRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Pending);

        return pendingRelationshipFromSelf;
    }

    public static async addRelationship(
        from: AccountController,
        to: AccountController
    ): Promise<{ acceptedRelationshipFromSelf: Relationship; acceptedRelationshipPeer: Relationship }> {
        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        return await this.addRelationshipWithExistingTemplate(from, to, templateFrom);
    }

    public static async addRelationshipWithExistingTemplate(
        from: AccountController,
        to: AccountController,
        template: RelationshipTemplate
    ): Promise<{ acceptedRelationshipFromSelf: Relationship; acceptedRelationshipPeer: Relationship }> {
        const pendingRelationshipFromSelf = await TestUtil.addPendingRelationship(from, to, template);

        const acceptedRelationshipFromSelf = await from.relationships.accept(pendingRelationshipFromSelf.id);
        expect(acceptedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);

        // Get accepted relationship
        await this.sleep(300);
        const syncedRelationshipsPeer = (await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0)).relationships;

        await from.syncDatawallet();

        expect(syncedRelationshipsPeer).toHaveLength(1);
        const acceptedRelationshipPeer = syncedRelationshipsPeer[0];
        expect(acceptedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Active);
        expect(acceptedRelationshipFromSelf.id.toString()).toBe(acceptedRelationshipPeer.id.toString());

        return { acceptedRelationshipFromSelf, acceptedRelationshipPeer };
    }

    public static async revokeRelationship(
        from: AccountController,
        to: AccountController
    ): Promise<{ revokedRelationshipFromSelf: Relationship; revokedRelationshipPeer: Relationship }> {
        const relationshipId = (await to.relationships.getRelationshipToIdentity(from.identity.address))!.id;
        const revokedRelationshipPeer = await to.relationships.revoke(relationshipId);
        const revokedRelationshipFromSelf = (await TestUtil.syncUntil(from, (syncResult) => syncResult.relationships.length > 0)).relationships[0];

        return { revokedRelationshipFromSelf, revokedRelationshipPeer };
    }

    public static async terminateRelationship(
        from: AccountController,
        to: AccountController
    ): Promise<{ terminatedRelationshipFromSelf: Relationship; terminatedRelationshipPeer: Relationship }> {
        const relationshipId = (await from.relationships.getRelationshipToIdentity(to.identity.address))!.id;
        const terminatedRelationshipFromSelf = await from.relationships.terminate(relationshipId);
        const terminatedRelationshipPeer = (await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0)).relationships[0];

        return { terminatedRelationshipFromSelf, terminatedRelationshipPeer };
    }

    public static async reactivateRelationship(
        from: AccountController,
        to: AccountController
    ): Promise<{ reactivatedRelationshipFromSelf: Relationship; reactivatedRelationshipPeer: Relationship }> {
        const relationshipId = (await from.relationships.getRelationshipToIdentity(to.identity.address))!.id;
        await from.relationships.requestReactivation(relationshipId);
        await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0);
        const reactivatedRelationshipFromSelf = await to.relationships.acceptReactivation(relationshipId);
        const reactivatedRelationshipPeer = (await TestUtil.syncUntil(from, (syncResult) => syncResult.relationships.length > 0)).relationships[0];

        return { reactivatedRelationshipFromSelf, reactivatedRelationshipPeer };
    }

    public static async decomposeRelationship(from: AccountController, to: AccountController): Promise<Relationship> {
        const relationship = (await from.relationships.getRelationshipToIdentity(to.identity.address))!;
        await from.relationships.decompose(relationship.id);
        await from.cleanupDataOfDecomposedRelationship(relationship);
        const decomposedRelationshipPeer = (await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0)).relationships[0];

        return decomposedRelationshipPeer;
    }

    public static async terminateAndDecomposeRelationshipMutually(from: AccountController, to: AccountController): Promise<void> {
        await TestUtil.terminateRelationship(from, to);
        await TestUtil.decomposeRelationship(from, to);

        const relationship = (await to.relationships.getRelationshipToIdentity(from.identity.address))!;
        await to.relationships.decompose(relationship.id);
        await to.cleanupDataOfDecomposedRelationship(relationship);
    }

    public static async generateAddressPseudonym(backboneBaseUrl: string): Promise<CoreAddress> {
        const pseudoPublicKey = CoreBuffer.fromUtf8("deleted identity");
        const pseudonym = await IdentityUtil.createAddress({ algorithm: 1, publicKey: pseudoPublicKey }, new URL(backboneBaseUrl).hostname);

        return pseudonym;
    }

    /**
     * SyncEvents in the Backbone are only eventually consistent. This means that if you send a message now and
     * get all SyncEvents right after, you cannot rely on getting a NewMessage SyncEvent right away. So instead
     * this method executes the syncEverything()-method of the account controller until the condition specified in
     * the `until` callback is met.
     */
    public static async syncUntil(accountController: AccountController, until: (syncResult: ChangedItems) => boolean): Promise<ChangedItems> {
        const syncResult = new ChangedItems();

        let iterationNumber = 0;
        do {
            await sleep(150 * iterationNumber);
            const newSyncResult = await accountController.syncEverything();
            syncResult.messages.push(...newSyncResult.messages);
            syncResult.relationships.push(...newSyncResult.relationships);
            syncResult.identityDeletionProcesses.push(...newSyncResult.identityDeletionProcesses);
            iterationNumber++;
        } while (!until(syncResult) && iterationNumber < 20);

        if (!until(syncResult)) {
            throw new Error("syncUntil condition was not met");
        }
        return syncResult;
    }

    public static async syncUntilHas<T extends keyof IChangedItems>(accountController: AccountController, id: CoreId, key: T): Promise<ChangedItems[T]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult[key].some((r) => r.id.equals(id)));

        return syncResult[key];
    }

    public static async syncUntilHasMany<T extends keyof IChangedItems>(accountController: AccountController, key: T, expectedNumberOfItems = 1): Promise<ChangedItems[T]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult[key].length >= expectedNumberOfItems);

        return syncResult[key];
    }

    public static async syncUntilHasIdentityDeletionProcess(accountController: AccountController, id: CoreId): Promise<IdentityDeletionProcess[]> {
        return await TestUtil.syncUntilHas(accountController, id, "identityDeletionProcesses");
    }

    public static async syncUntilHasIdentityDeletionProcesses(accountController: AccountController): Promise<IdentityDeletionProcess[]> {
        return await TestUtil.syncUntilHasMany(accountController, "identityDeletionProcesses");
    }

    public static async syncUntilHasRelationships(accountController: AccountController, expectedNumberOfRelationships?: number): Promise<Relationship[]> {
        return await TestUtil.syncUntilHasMany(accountController, "relationships", expectedNumberOfRelationships);
    }

    public static async syncUntilHasRelationship(accountController: AccountController, id: CoreId): Promise<Relationship[]> {
        return await TestUtil.syncUntilHas(accountController, id, "relationships");
    }

    public static async syncUntilHasMessages(accountController: AccountController, expectedNumberOfMessages = 1): Promise<Message[]> {
        return await TestUtil.syncUntilHasMany(accountController, "messages", expectedNumberOfMessages);
    }

    public static async syncUntilHasMessage(accountController: AccountController, id: CoreId): Promise<Message[]> {
        return await TestUtil.syncUntilHas(accountController, id, "messages");
    }

    public static async syncUntilHasError(accountController: AccountController): Promise<any> {
        try {
            await TestUtil.syncUntilHasMessages(accountController, 100);
        } catch (e) {
            return e;
        }

        throw new Error("no error occured");
    }

    public static async sendRelationshipTemplate(from: AccountController, body?: ISerializable): Promise<RelationshipTemplate> {
        if (!body) {
            body = {
                content: "template"
            };
        }
        return await from.relationshipTemplates.sendRelationshipTemplate({
            content: body,
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });
    }

    public static async sendRelationshipTemplateAndToken(account: AccountController, body?: ISerializable): Promise<string> {
        if (!body) {
            body = {
                content: "template"
            };
        }
        const template = await account.relationshipTemplates.sendRelationshipTemplate({
            content: body,
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });
        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey
        });

        const token = await account.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            ephemeral: false
        });

        const tokenRef = token.toTokenReference(account.config.baseUrl).truncate();
        return tokenRef;
    }

    public static async sendRelationship(account: AccountController, template: RelationshipTemplate, body?: ISerializable): Promise<Relationship> {
        if (!body) {
            body = {
                content: "request"
            };
        }
        return await account.relationships.sendRelationship({
            template: template,
            creationContent: body
        });
    }

    public static async fetchRelationshipTemplateFromTokenReference(account: AccountController, tokenReference: string): Promise<RelationshipTemplate> {
        const receivedToken = await account.tokens.loadPeerTokenByReference(TokenReference.from(tokenReference), false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const template = await account.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.cache!.content);
        return template;
    }

    public static async sendMessage(from: AccountController, to: AccountController | AccountController[], content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, Array.isArray(to) ? to : [to], [], content);
    }

    public static async sendMessageWithFile(from: AccountController, to: AccountController, file: File, content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, [to], [file], content);
    }

    public static async sendMessagesWithFile(from: AccountController, recipients: AccountController[], file: File, content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, recipients, [file], content);
    }

    public static async sendMessagesWithFiles(from: AccountController, recipients: AccountController[], files: File[], content?: Serializable): Promise<Message> {
        const recipientAddresses: CoreAddress[] = [];
        for (const controller of recipients) {
            recipientAddresses.push(controller.identity.address);
        }
        if (!content) {
            content = Serializable.fromAny({ content: "TestContent" });
        }
        return await from.messages.sendMessage({
            recipients: recipientAddresses,
            content: content,
            attachments: files
        });
    }

    public static async uploadFile(from: AccountController, fileContent: CoreBuffer): Promise<File> {
        const params: ISendFileParameters = {
            buffer: fileContent,
            title: "Test",
            description: "Dies ist eine Beschreibung",
            filename: "Test.bin",
            filemodified: CoreDate.from("2019-09-30T00:00:00.000Z"),
            mimetype: "application/json",
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            tags: ["tag1", "tag2"]
        };

        const file = await from.files.sendFile(params);
        return file;
    }

    public static async sleep(ms = 500): Promise<void> {
        if (ms <= 0) throw new Error("Please enter a positive value greater than 0.");

        return await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    public static async runDeletionJob(): Promise<void> {
        const backboneVersion = this.getBackboneVersion();
        const appsettingsOverrideLocation = process.env.APPSETTINGS_OVERRIDE_LOCATION ?? `${__dirname}/../../../../.dev/appsettings.override.json`;

        await new GenericContainer(`ghcr.io/nmshd/backbone-identity-deletion-jobs:${backboneVersion}`)
            .withWaitStrategy(Wait.forOneShotStartup())
            .withCommand(["--Worker", "ActualDeletionWorker"])
            .withNetworkMode("backbone")
            .withCopyFilesToContainer([{ source: appsettingsOverrideLocation, target: "/app/appsettings.override.json" }])
            .start();
    }

    private static getBackboneVersion() {
        if (process.env.BACKBONE_VERSION) return process.env.BACKBONE_VERSION;

        const composeFile = fs.readFileSync(path.resolve(`${__dirname}/../../../../.dev/compose.backbone.yml`));

        const regex = /image: ghcr\.io\/nmshd\/backbone-consumer-api:(?<version>[^\r\n]*)/;
        const match = composeFile.toString().match(regex);
        if (!match?.groups?.version) throw new Error("Could not find backbone version in compose file");

        return match.groups.version;
    }
}
