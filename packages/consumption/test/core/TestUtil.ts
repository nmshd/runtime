/* eslint-disable jest/no-standalone-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { EventBus, EventEmitter2EventBus, sleep } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import {
    AccountController,
    ChangedItems,
    File,
    IConfigOverwrite,
    ISendFileParameters,
    Message,
    Relationship,
    RelationshipStatus,
    RelationshipTemplate,
    TokenContentRelationshipTemplate,
    TokenReference,
    Transport,
    TransportLoggerFactory
} from "@nmshd/transport";
import { LogLevel } from "typescript-logging";
import {
    ConsumptionConfig,
    ConsumptionController,
    NotificationItemConstructor,
    NotificationItemProcessorConstructor,
    RequestItemConstructor,
    RequestItemProcessorConstructor
} from "../../src";

export const loggerFactory = new NodeLoggerFactory({
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

export class TestUtil {
    private static readonly fatalLogger = new SimpleLoggerFactory(LogLevel.Fatal);
    private static oldLogger: ILoggerFactory;

    public static useFatalLoggerFactory(): void {
        this.oldLogger = (TransportLoggerFactory as any).instance;
        TransportLoggerFactory.init(this.fatalLogger);
    }

    public static useTestLoggerFactory(): void {
        TransportLoggerFactory.init(this.oldLogger);
    }

    public static expectThrows(method: Function, customExceptionMatcher?: (e: Error) => void): void;
    public static expectThrows(method: Function, errorMessagePatternOrRegexp: RegExp): void;
    /**
     *
     * @param method The function which should throw the exception
     * @param errorMessagePattern the pattern the error message should match (asterisks ('\*') are wildcards that correspond to '.\*' in regex)
     */
    public static expectThrows(method: Function, errorMessagePattern: string): void;

    public static expectThrows(method: Function, errorMessageRegexp: RegExp | string | ((e: Error) => void) | undefined): void {
        let error: Error | undefined;

        try {
            method();
        } catch (err: unknown) {
            if (!(err instanceof Error)) throw err;

            error = err;
        }

        expect(error).toBeInstanceOf(Error);

        if (!errorMessageRegexp) return;

        if (typeof errorMessageRegexp === "function") {
            errorMessageRegexp(error!);
            return;
        }

        if (typeof errorMessageRegexp === "string") {
            errorMessageRegexp = new RegExp(errorMessageRegexp.replaceAll("*", ".*"));
        }

        expect(error!.message).toMatch(new RegExp(errorMessageRegexp));
    }

    public static async createConnection(): Promise<IDatabaseConnection> {
        let dbConnection;
        if (process.env.USE_LOKIJS === "true") {
            dbConnection = LokiJsConnection.inMemory();
        } else {
            dbConnection = new MongoDbConnection(process.env.CONNECTION_STRING!);
            await dbConnection.connect();
        }
        return dbConnection;
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

    public static createTransport(
        eventBus: EventBus = new EventEmitter2EventBus(() => {
            // ignore errors
        }),
        configOverwrite?: Partial<IConfigOverwrite>
    ): Transport {
        return new Transport({ ...this.createConfig(), ...configOverwrite }, eventBus, loggerFactory);
    }

    public static async provideAccounts(
        transport: Transport,
        connection: IDatabaseConnection,
        count: number,
        requestItemProcessors = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessors = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>(),
        customConsumptionConfig?: ConsumptionConfig
    ): Promise<{ accountController: AccountController; consumptionController: ConsumptionController }[]> {
        const accounts = [];

        for (let i = 0; i < count; i++) {
            const account = await this.createAccount(connection, transport, requestItemProcessors, notificationItemProcessors, customConsumptionConfig);
            accounts.push(account);
        }

        return accounts;
    }

    private static async createAccount(
        connection: IDatabaseConnection,
        transport: Transport,
        requestItemProcessors = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessors = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>(),
        customConsumptionConfig?: ConsumptionConfig
    ): Promise<{ accountController: AccountController; consumptionController: ConsumptionController }> {
        const db = await connection.getDatabase(`x${Math.random().toString(36).substring(7)}`);
        const accountController = new AccountController(transport, db, transport.config);
        await accountController.init();

        const consumptionController = await new ConsumptionController(transport, accountController, customConsumptionConfig ?? { setDefaultRepositoryAttributes: false }).init(
            requestItemProcessors,
            notificationItemProcessors
        );

        return { accountController, consumptionController };
    }

    public static async addPendingRelationship(
        from: AccountController,
        to: AccountController
    ): Promise<{ pendingRelationshipFromSelf: Relationship; pendingRelationshipPeer: Relationship }> {
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

        const pendingRelationshipPeer = (await to.relationships.getRelationshipToIdentity(from.identity.address))!;
        expect(pendingRelationshipPeer.status).toStrictEqual(RelationshipStatus.Pending);

        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationshipFromSelf = syncedRelationships[0];
        expect(pendingRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Pending);

        return { pendingRelationshipFromSelf, pendingRelationshipPeer };
    }

    public static async addRelationship(from: AccountController, to: AccountController, templateContent?: any, requestContent?: any): Promise<Relationship[]> {
        templateContent ??= { metadata: { mycontent: "template" } };

        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: templateFrom.id,
            secretKey: templateFrom.secretKey
        });

        const token = await from.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ hours: 12 }),
            ephemeral: false
        });

        const tokenRef = token.toTokenReference(from.config.baseUrl);

        const receivedToken = await to.tokens.loadPeerTokenByReference(tokenRef, false);

        if (!(receivedToken.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.content);

        const relRequest = await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: requestContent ?? {
                metadata: { mycontent: "request" }
            }
        });

        // Accept relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationship(from, relRequest.id);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];
        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const acceptedRelationshipFromSelf = await from.relationships.accept(pendingRelationship.id);
        expect(acceptedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);

        // Get accepted relationship
        await sleep(300);
        const syncedRelationshipsPeer = (await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0)).relationships;

        await from.syncDatawallet();

        expect(syncedRelationshipsPeer).toHaveLength(1);
        const acceptedRelationshipPeer = syncedRelationshipsPeer[0];
        expect(acceptedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Active);
        expect(relRequest.id.toString()).toStrictEqual(acceptedRelationshipFromSelf.id.toString());
        expect(relRequest.id.toString()).toStrictEqual(acceptedRelationshipPeer.id.toString());

        return [acceptedRelationshipFromSelf, acceptedRelationshipPeer];
    }

    public static async ensureActiveRelationship(from: AccountController, to: AccountController): Promise<void> {
        const toAddress = to.identity.address.toString();

        const queryForPendingRelationships = {
            "peer.address": toAddress,
            status: RelationshipStatus.Pending
        };
        const pendingRelationships = await from.relationships.getRelationships(queryForPendingRelationships);

        if (pendingRelationships.length !== 0) {
            await from.relationships.accept(pendingRelationships[0].id);
            await TestUtil.syncUntilHasRelationships(to);
            return;
        }

        const queryForActiveRelationships = {
            "peer.address": toAddress,
            status: RelationshipStatus.Active
        };
        const activeRelationships = await from.relationships.getRelationships(queryForActiveRelationships);

        if (activeRelationships.length === 0) {
            await TestUtil.addRelationship(from, to);
            return;
        }

        return;
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

    public static async decomposeRelationship(fromAccount: AccountController, fromConsumption: ConsumptionController, to: AccountController): Promise<Relationship> {
        const relationship = (await fromAccount.relationships.getRelationshipToIdentity(to.identity.address))!;
        await fromAccount.relationships.decompose(relationship.id);
        await fromAccount.cleanupDataOfDecomposedRelationship(relationship);
        await fromConsumption.cleanupDataOfDecomposedRelationship(to.identity.address, relationship.id);
        const decomposedRelationshipPeer = (await TestUtil.syncUntil(to, (syncResult) => syncResult.relationships.length > 0)).relationships[0];

        return decomposedRelationshipPeer;
    }

    public static async mutualDecomposeIfActiveRelationshipExists(
        fromAccount: AccountController,
        fromConsumption: ConsumptionController,
        toAccount: AccountController,
        toConsumption: ConsumptionController
    ): Promise<void> {
        const queryForActiveRelationships = {
            "peer.address": toAccount.identity.address.toString(),
            status: RelationshipStatus.Active
        };
        const activeRelationshipsToPeer = await fromAccount.relationships.getRelationships(queryForActiveRelationships);

        if (activeRelationshipsToPeer.length !== 0) {
            await TestUtil.terminateRelationship(fromAccount, toAccount);
            await TestUtil.decomposeRelationship(fromAccount, fromConsumption, toAccount);
            await TestUtil.decomposeRelationship(toAccount, toConsumption, fromAccount);
        }

        return;
    }

    /**
     * SyncEvents in the Backbone are only enventually consistent. This means that if you send a message now and
     * get all SyncEvents right after, you cannot rely on getting a NewMessage SyncEvent right away. So instead
     * this method executes the syncEverything()-method of the synchronization controller until the condition
     * specified in the `until` callback is met.
     */
    public static async syncUntil(accountController: AccountController, until: (syncResult: ChangedItems) => boolean): Promise<ChangedItems> {
        const { messages, relationships, identityDeletionProcesses, files } = await accountController.syncEverything();
        const syncResult = new ChangedItems([...relationships], [...messages], [...identityDeletionProcesses], [...files]);

        let iterationNumber = 0;
        while (!until(syncResult) && iterationNumber < 15) {
            await sleep(iterationNumber * 25);
            const newSyncResult = await accountController.syncEverything();
            syncResult.messages.push(...newSyncResult.messages);
            syncResult.relationships.push(...newSyncResult.relationships);
            iterationNumber++;
        }
        return syncResult;
    }

    public static async syncUntilHasRelationships(accountController: AccountController): Promise<Relationship[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.relationships.length > 0);
        return syncResult.relationships;
    }

    public static async syncUntilHasRelationship(accountController: AccountController, id: CoreId): Promise<Relationship[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.relationships.some((r) => r.id === id));
        return syncResult.relationships;
    }

    public static async syncUntilHasMessages(accountController: AccountController, expectedNumberOfMessages = 1): Promise<Message[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.messages.length >= expectedNumberOfMessages);
        return syncResult.messages;
    }

    public static async syncUntilHasMessage(accountController: AccountController, id: CoreId): Promise<Message[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.messages.some((m) => m.id.equals(id)));
        return syncResult.messages;
    }

    public static async syncUntilHasFiles(accountController: AccountController, expectedNumberOfFiles = 1): Promise<File[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.files.length >= expectedNumberOfFiles);
        return syncResult.files;
    }

    public static async syncUntilHasFile(accountController: AccountController, id: CoreId): Promise<File[]> {
        const syncResult = await TestUtil.syncUntil(accountController, (syncResult) => syncResult.files.some((m) => m.id.equals(id)));
        return syncResult.files;
    }

    public static async sendRelationshipTemplate(from: AccountController, content?: ISerializable): Promise<RelationshipTemplate> {
        return await from.relationshipTemplates.sendRelationshipTemplate({
            content: content ?? { content: "template" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });
    }

    public static async sendRelationshipTemplateAndToken(account: AccountController, content?: ISerializable): Promise<string> {
        const template = await account.relationshipTemplates.sendRelationshipTemplate({
            content: content ?? {
                content: "template"
            },
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

    public static async sendRelationship(account: AccountController, template: RelationshipTemplate, content?: ISerializable): Promise<Relationship> {
        content ??= {
            content: "request"
        };

        return await account.relationships.sendRelationship({ template, creationContent: content });
    }

    public static async fetchRelationshipTemplateFromTokenReference(account: AccountController, tokenReference: string): Promise<RelationshipTemplate> {
        const receivedToken = await account.tokens.loadPeerTokenByReference(TokenReference.from(tokenReference), false);

        if (!(receivedToken.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const template = await account.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.content);
        return template;
    }

    public static async sendMessage(from: AccountController, to: AccountController, content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, [to], [], content);
    }

    public static async sendMessageWithFile(from: AccountController, to: AccountController, file: File, content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, [to], [file], content);
    }

    public static async sendMessagesWithFile(from: AccountController, recipients: AccountController[], file: File, content?: Serializable): Promise<Message> {
        return await this.sendMessagesWithFiles(from, recipients, [file], content);
    }

    public static async sendMessagesWithFiles(from: AccountController, recipients: AccountController[], files: File[], content?: Serializable): Promise<Message> {
        const addresses: CoreAddress[] = [];
        for (const controller of recipients) {
            addresses.push(controller.identity.address);
        }

        return await from.messages.sendMessage({
            recipients: addresses,
            content: content ?? Serializable.fromUnknown({ content: "TestContent" }),
            attachments: files
        });
    }

    public static async uploadFile(from: AccountController, parameters?: { fileContent?: CoreBuffer; expiresAt?: CoreDate; tags?: string[] }): Promise<File> {
        const params: ISendFileParameters = {
            buffer: parameters?.fileContent ?? CoreBuffer.from("test"),
            title: "aTitle",
            description: "aDescription",
            filename: "aFilename",
            filemodified: CoreDate.from("2019-09-30T00:00:00.000Z"),
            mimetype: "aMimetype",
            expiresAt: parameters?.expiresAt ?? CoreDate.utc().add({ minutes: 5 }),
            tags: parameters?.tags
        };

        const file = await from.files.sendFile(params);
        return file;
    }

    public static async cleanupAttributes(consumptionController: ConsumptionController): Promise<void> {
        const attributes = await consumptionController.attributes.getLocalAttributes({});
        await Promise.all(attributes.map((attribute) => consumptionController.attributes.deleteAttributeUnsafe(attribute.id)));
    }
}
