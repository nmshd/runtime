/* eslint-disable jest/no-standalone-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { EventBus, EventEmitter2EventBus, sleep } from "@js-soft/ts-utils";
import { CoreBuffer } from "@nmshd/crypto";
import {
    AccountController,
    ChangedItems,
    CoreAddress,
    CoreDate,
    CoreId,
    File,
    IConfigOverwrite,
    ISendFileParameters,
    Message,
    Relationship,
    RelationshipStatus,
    RelationshipTemplate,
    TokenContentRelationshipTemplate,
    Transport,
    TransportLoggerFactory
} from "@nmshd/transport";
import { LogLevel } from "typescript-logging";
import { ConsumptionController, NotificationItemConstructor, NotificationItemProcessorConstructor, RequestItemConstructor, RequestItemProcessorConstructor } from "../../src";

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

    public static async expectThrowsAsync(method: Function | Promise<any>, customExceptionMatcher?: (e: Error) => void): Promise<void>;
    public static async expectThrowsAsync(method: Function | Promise<any>, errorMessagePatternOrRegexp: RegExp): Promise<void>;
    /**
     *
     * @param method The function which should throw the exception
     * @param errorMessagePattern the pattern the error message should match (asterisks ('\*') are wildcards that correspond to '.\*' in regex)
     */
    public static async expectThrowsAsync(method: Function | Promise<any>, errorMessagePattern: string): Promise<void>;

    public static async expectThrowsAsync(method: Function | Promise<any>, errorMessageRegexp: RegExp | string | ((e: Error) => void) | undefined): Promise<void> {
        let error: Error | undefined;
        try {
            if (typeof method === "function") {
                await method();
            } else {
                await method;
            }
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
            debug: true,
            supportedIdentityVersion: 1
        };
    }

    public static createTransport(
        connection: IDatabaseConnection,
        eventBus: EventBus = new EventEmitter2EventBus(() => {
            // ignore errors
        })
    ): Transport {
        return new Transport(connection, this.createConfig(), eventBus, loggerFactory);
    }

    public static async provideAccounts(
        transport: Transport,
        count: number,
        requestItemProcessors = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessors = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>()
    ): Promise<{ accountController: AccountController; consumptionController: ConsumptionController }[]> {
        const accounts = [];

        for (let i = 0; i < count; i++) {
            const account = await this.createAccount(transport, requestItemProcessors, notificationItemProcessors);
            accounts.push(account);
        }

        return accounts;
    }

    private static async createAccount(
        transport: Transport,
        requestItemProcessors = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessors = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>()
    ): Promise<{ accountController: AccountController; consumptionController: ConsumptionController }> {
        const db = await transport.createDatabase(`x${Math.random().toString(36).substring(7)}`);
        const accountController = new AccountController(transport, db, transport.config);
        await accountController.init();

        const consumptionController = await new ConsumptionController(transport, accountController).init(requestItemProcessors, notificationItemProcessors);

        return { accountController, consumptionController };
    }

    public static async addRelationship(from: AccountController, to: AccountController, templateContent?: any, requestContent?: any): Promise<Relationship[]> {
        if (!templateContent) {
            templateContent = {
                metadata: {
                    mycontent: "template"
                }
            };
        }

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

        const tokenRef = token.truncate();

        const receivedToken = await to.tokens.loadPeerTokenByTruncated(tokenRef, false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplate(receivedToken.cache!.content.templateId, receivedToken.cache!.content.secretKey);

        const relRequest = await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: requestContent ?? {
                metadata: { mycontent: "request" }
            }
        });

        // Accept relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
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

    /**
     * SyncEvents in the backbone are only enventually consistent. This means that if you send a message now and
     * get all SyncEvents right after, you cannot rely on getting a NewMessage SyncEvent right away. So instead
     * this method executes the syncEverything()-method of the synchronization controller until the condition
     * specified in the `until` callback is met.
     */
    public static async syncUntil(accountController: AccountController, until: (syncResult: ChangedItems) => boolean): Promise<ChangedItems> {
        const { messages, relationships } = await accountController.syncEverything();
        const syncResult = new ChangedItems([...relationships], [...messages]);

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

        const tokenRef = token.truncate();
        return tokenRef;
    }

    public static async sendRelationship(account: AccountController, template: RelationshipTemplate, content?: ISerializable): Promise<Relationship> {
        content ??= {
            content: "request"
        };

        return await account.relationships.sendRelationship({ template, creationContent: content });
    }

    public static async fetchRelationshipTemplateFromTokenReference(account: AccountController, tokenReference: string): Promise<RelationshipTemplate> {
        const receivedToken = await account.tokens.loadPeerTokenByTruncated(tokenReference, false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const template = await account.relationshipTemplates.loadPeerRelationshipTemplate(receivedToken.cache!.content.templateId, receivedToken.cache!.content.secretKey);
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

    public static async uploadFile(from: AccountController, fileContent: CoreBuffer): Promise<File> {
        const params: ISendFileParameters = {
            buffer: fileContent,
            title: "Test",
            description: "Dies ist eine Beschreibung",
            filename: "Test.bin",
            filemodified: CoreDate.from("2019-09-30T00:00:00.000Z"),
            mimetype: "application/json",
            expiresAt: CoreDate.utc().add({ minutes: 5 })
        };

        const file = await from.files.sendFile(params);
        return file;
    }
}
