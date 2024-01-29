/* eslint-disable jest/no-standalone-expect */
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { Serializable } from "@js-soft/ts-serval";
import { Result, sleep, SubscriptionTarget } from "@js-soft/ts-utils";
import { FileDTO, MessageDTO, RelationshipDTO, RelationshipTemplateDTO, SyncEverythingResponse } from "@nmshd/runtime";
import { CoreDate, IConfigOverwrite, Realm, TransportLoggerFactory } from "@nmshd/transport";
import { LogLevel } from "typescript-logging";
import { AppConfig, AppRuntime, LocalAccountDTO, LocalAccountSession, createAppConfig as runtime_createAppConfig } from "../../src";
import { NativeBootstrapperMock } from "../mocks/NativeBootstrapperMock";
import { FakeUIBridge } from "./FakeUIBridge";

export class TestUtil {
    public static async createRuntime(configOverride?: any): Promise<AppRuntime> {
        const config = this.createAppConfig(configOverride);

        const nativeBootstrapperMock = new NativeBootstrapperMock();
        await nativeBootstrapperMock.init();
        const runtime = await AppRuntime.create(nativeBootstrapperMock, config);
        runtime.registerUIBridge(new FakeUIBridge());

        return runtime;
    }

    public static async createRuntimeWithoutInit(configOverride?: any): Promise<AppRuntime> {
        const config = this.createAppConfig(configOverride);

        const nativeBootstrapperMock = new NativeBootstrapperMock();
        await nativeBootstrapperMock.init();
        const runtime = new AppRuntime(nativeBootstrapperMock.nativeEnvironment, config);

        return runtime;
    }

    private static createAppConfig(configOverride?: any): AppConfig {
        const notDefinedEnvironmentVariables = ["NMSHD_TEST_BASEURL", "NMSHD_TEST_CLIENTID", "NMSHD_TEST_CLIENTSECRET"].filter((env) => !process.env[env]);

        if (notDefinedEnvironmentVariables.length > 0) {
            throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`);
        }

        const transportOverride: Omit<IConfigOverwrite, "supportedIdentityVersion"> = {
            baseUrl: globalThis.process.env.NMSHD_TEST_BASEURL!,
            platformClientId: globalThis.process.env.NMSHD_TEST_CLIENTID!,
            platformClientSecret: globalThis.process.env.NMSHD_TEST_CLIENTSECRET!,
            debug: true
        };

        return runtime_createAppConfig({
            transportLibrary: transportOverride,
            logging: {},
            applicationId: "eu.enmeshed.test",
            ...configOverride
        });
    }

    public static async createSession(runtime: AppRuntime): Promise<LocalAccountSession> {
        const localAccount1 = await runtime.accountServices.createAccount(Realm.Prod, "Profil 1");
        return await runtime.selectAccount(localAccount1.id, "test");
    }

    private static readonly fatalLogger = new SimpleLoggerFactory(LogLevel.Fatal);
    private static oldLogger: ILoggerFactory;

    public static useFatalLoggerFactory(): void {
        this.oldLogger = (TransportLoggerFactory as any).instance;
        TransportLoggerFactory.init(this.fatalLogger);
    }
    public static useTestLoggerFactory(): void {
        TransportLoggerFactory.init(this.oldLogger);
    }

    public static async awaitEvent<TEvent>(
        runtime: AppRuntime,
        subscriptionTarget: SubscriptionTarget<TEvent>,
        timeout?: number,
        assertionFunction?: (t: TEvent) => boolean
    ): Promise<TEvent> {
        const eventBus = runtime.eventBus;
        let subscriptionId: number;

        const eventPromise = new Promise<TEvent>((resolve) => {
            subscriptionId = eventBus.subscribe(subscriptionTarget, (event: TEvent) => {
                if (assertionFunction && !assertionFunction(event)) return;

                resolve(event);
            });
        });
        if (!timeout) {
            return await eventPromise.finally(() => eventBus.unsubscribe(subscriptionId));
        }

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<TEvent>((_resolve, reject) => {
            timeoutId = setTimeout(
                () => reject(new Error(`timeout exceeded for waiting for event ${typeof subscriptionTarget === "string" ? subscriptionTarget : subscriptionTarget.name}`)),
                timeout
            );
        });

        return await Promise.race([eventPromise, timeoutPromise]).finally(() => {
            eventBus.unsubscribe(subscriptionId);
            clearTimeout(timeoutId);
        });
    }

    public static async expectEvent<T>(runtime: AppRuntime, subscriptionTarget: SubscriptionTarget<T>, timeoutInMS = 1000): Promise<T> {
        const eventInstance: T = await this.awaitEvent(runtime, subscriptionTarget, timeoutInMS);
        expect(eventInstance, "Event received").toBeDefined();
        return eventInstance;
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

    public static async expectThrowsAsync(method: Function | Promise<any>, customExceptionMatcher: (e: Error) => void): Promise<void>;

    public static async expectThrowsAsync(method: Function | Promise<any>, errorMessageRegexp: RegExp | string): Promise<void>;

    public static async expectThrowsAsync(method: Function | Promise<any>, errorMessageRegexp: RegExp | string | ((e: Error) => void)): Promise<void> {
        let error: Error | undefined;
        try {
            if (typeof method === "function") {
                await method();
            } else {
                await method;
            }
        } catch (err: any) {
            error = err;
        }
        expect(error).toBeInstanceOf(Error);

        if (typeof errorMessageRegexp === "function") {
            errorMessageRegexp(error!);
            return;
        }

        if (errorMessageRegexp) {
            expect(error!.message).toMatch(new RegExp(errorMessageRegexp));
        }
    }

    public static async provideAccounts(runtime: AppRuntime, count: number): Promise<LocalAccountDTO[]> {
        const accounts: LocalAccountDTO[] = [];

        for (let i = 0; i < count; i++) {
            accounts.push(await runtime.accountServices.createAccount(Realm.Prod, `Account ${i}`));
        }

        return accounts;
    }

    public static async createAndLoadPeerTemplate(
        from: LocalAccountSession,
        to: LocalAccountSession,
        content: any = {
            mycontent: "template"
        }
    ): Promise<RelationshipTemplateDTO> {
        const templateFrom = (
            await from.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content,
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toString(),
                maxNumberOfAllocations: 1
            })
        ).value;

        const tokenFrom = (
            await from.transportServices.relationshipTemplates.createTokenForOwnTemplate({
                templateId: templateFrom.id,
                ephemeral: true,
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toString()
            })
        ).value;

        const templateTo = await to.transportServices.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: tokenFrom.truncatedReference
        });
        return templateTo.value;
    }

    public static async requestRelationshipForTemplate(
        from: LocalAccountSession,
        templateId: string,
        content: any = {
            mycontent: "request"
        }
    ): Promise<RelationshipDTO> {
        const relRequest = await from.transportServices.relationships.createRelationship({ templateId, content });
        return relRequest.value;
    }

    public static async acceptRelationship(
        session: LocalAccountSession,
        relationshipId: string,
        content: any = {
            mycontent: "response"
        }
    ): Promise<RelationshipDTO> {
        const relationship = (
            await session.transportServices.relationships.getRelationship({
                id: relationshipId
            })
        ).value;

        const acceptedRelationship = (
            await session.transportServices.relationships.acceptRelationshipChange({
                changeId: relationship.changes[0].id,
                content,
                relationshipId
            })
        ).value;
        return acceptedRelationship;
    }

    public static async rejectRelationship(
        session: LocalAccountSession,
        relationshipId: string,
        content: any = {
            mycontent: "rejection"
        }
    ): Promise<RelationshipDTO> {
        const relationship = (
            await session.transportServices.relationships.getRelationship({
                id: relationshipId
            })
        ).value;

        const rejectedRelationship = (
            await session.transportServices.relationships.rejectRelationshipChange({
                changeId: relationship.changes[0].id,
                content,
                relationshipId
            })
        ).value;
        return rejectedRelationship;
    }

    public static async revokeRelationship(
        session: LocalAccountSession,
        relationshipId: string,
        content: any = {
            mycontent: "revokation"
        }
    ): Promise<RelationshipDTO> {
        const relationship = (
            await session.transportServices.relationships.getRelationship({
                id: relationshipId
            })
        ).value;

        const rejectedRelationship = (
            await session.transportServices.relationships.revokeRelationshipChange({
                changeId: relationship.changes[0].id,
                content,
                relationshipId
            })
        ).value;
        return rejectedRelationship;
    }

    public static async addRelationship(from: LocalAccountSession, to: LocalAccountSession): Promise<{ from: RelationshipDTO; to: RelationshipDTO }> {
        const templateTo = await TestUtil.createAndLoadPeerTemplate(from, to);
        const relationshipRequestTo = await TestUtil.requestRelationshipForTemplate(to, templateTo.id);
        let relationshipFrom = await TestUtil.syncUntilHasRelationship(from, relationshipRequestTo.id);
        relationshipFrom = await TestUtil.acceptRelationship(from, relationshipFrom.id);

        const relationshipTo = await TestUtil.syncUntilHasRelationship(to, relationshipRequestTo.id);

        return { from: relationshipFrom, to: relationshipTo };
    }

    public static async addRejectedRelationship(from: LocalAccountSession, to: LocalAccountSession): Promise<{ from: RelationshipDTO; to: RelationshipDTO }> {
        const templateTo = await TestUtil.createAndLoadPeerTemplate(from, to);
        const relationshipRequestTo = await TestUtil.requestRelationshipForTemplate(to, templateTo.id);
        let relationshipFrom = await TestUtil.syncUntilHasRelationship(from, relationshipRequestTo.id);
        relationshipFrom = await TestUtil.rejectRelationship(from, relationshipFrom.id);

        const relationshipTo = await TestUtil.syncUntilHasRelationship(to, relationshipRequestTo.id);

        return { from: relationshipFrom, to: relationshipTo };
    }

    /**
     * SyncEvents in the backbone are only eventually consistent. This means that if you send a message now and
     * get all SyncEvents right after, you cannot rely on getting a NewMessage SyncEvent right away. So instead
     * this method executes the syncEverything()-method of the synchronization controller until the condition
     * specified in the `until` callback is met.
     */
    public static async syncUntil(session: LocalAccountSession, until: (syncResult: SyncEverythingResponse) => boolean): Promise<SyncEverythingResponse> {
        const syncResult = await session.transportServices.account.syncEverything();

        const { messages, relationships } = syncResult.value;
        const syncResponse = { relationships: [...relationships], messages: [...messages] };

        let iterationNumber = 0;
        while (!until(syncResponse) && iterationNumber < 15) {
            await sleep(iterationNumber * 25);
            const newSyncResult = await session.transportServices.account.syncEverything();
            syncResponse.messages.push(...newSyncResult.value.messages);
            syncResponse.relationships.push(...newSyncResult.value.relationships);
            iterationNumber++;
        }
        return syncResponse;
    }

    public static async syncUntilHasRelationships(session: LocalAccountSession): Promise<RelationshipDTO[]> {
        const syncResult = await TestUtil.syncUntil(session, (syncResult) => syncResult.relationships.length > 0);
        return syncResult.relationships;
    }

    public static async syncUntilHasRelationship(session: LocalAccountSession, id: string): Promise<RelationshipDTO> {
        const syncResult = await TestUtil.syncUntil(session, (syncResult) => syncResult.relationships.some((r) => r.id === id));
        return syncResult.relationships[0];
    }

    public static async syncUntilHasMessages(session: LocalAccountSession, expectedNumberOfMessages = 1): Promise<MessageDTO[]> {
        const syncResult = await TestUtil.syncUntil(session, (syncResult) => syncResult.messages.length >= expectedNumberOfMessages);
        return syncResult.messages;
    }

    public static async syncUntilHasMessage(session: LocalAccountSession, id: string): Promise<MessageDTO> {
        const syncResult = await TestUtil.syncUntil(session, (syncResult) => syncResult.messages.some((m) => m.id === id));
        return syncResult.messages[0];
    }

    public static async sendMessage(from: LocalAccountSession, to: LocalAccountSession, content?: any): Promise<MessageDTO> {
        return await this.sendMessagesWithAttachments(from, [to], [], content);
    }

    public static async sendMessagesWithAttachments(from: LocalAccountSession, recipients: LocalAccountSession[], attachments: string[], content?: any): Promise<MessageDTO> {
        if (!content) {
            content = Serializable.fromUnknown({ content: "TestContent" });
        }

        const result = await from.transportServices.messages.sendMessage({
            recipients: recipients.map((r) => r.address),
            content,
            attachments
        });

        return result.value;
    }

    public static async uploadFile(session: LocalAccountSession, fileContent: Uint8Array): Promise<FileDTO> {
        const file = await session.transportServices.files.uploadOwnFile({
            expiresAt: CoreDate.utc().add({ minutes: 5 }).toString(),
            filename: "Test.bin",
            mimetype: "application/json",
            title: "Test",
            content: fileContent
        });
        return file.value;
    }

    public static expectSuccess<T>(result: Result<T>): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        expect(result.isSuccess, `${result.error?.code} | ${result.error?.message}`).toBe(true);
    }
}
