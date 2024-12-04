/* eslint-disable jest/no-standalone-expect */
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { SimpleLoggerFactory } from "@js-soft/simple-logger";
import { EventBus, Result, sleep } from "@js-soft/ts-utils";
import { ArbitraryMessageContent, ArbitraryRelationshipCreationContent, ArbitraryRelationshipTemplateContent } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import {
    FileDTO,
    MessageContentDerivation,
    MessageDTO,
    RelationshipCreationContentDerivation,
    RelationshipDTO,
    RelationshipTemplateContentDerivation,
    RelationshipTemplateDTO,
    SyncEverythingResponse
} from "@nmshd/runtime";
import { IConfigOverwrite, TransportLoggerFactory } from "@nmshd/transport";
import { LogLevel } from "typescript-logging";
import { AppConfig, AppRuntime, IUIBridge, LocalAccountDTO, LocalAccountSession, createAppConfig as runtime_createAppConfig } from "../../src";
import { FakeUIBridge } from "./FakeUIBridge";
import { FakeNativeBootstrapper } from "./natives/FakeNativeBootstrapper";

export class TestUtil {
    public static async createRuntime(configOverride?: any, uiBridge: IUIBridge = new FakeUIBridge(), eventBus?: EventBus): Promise<AppRuntime> {
        const config = this.createAppConfig(configOverride);

        const nativeBootstrapper = new FakeNativeBootstrapper(eventBus);
        await nativeBootstrapper.init();
        const runtime = await AppRuntime.create(nativeBootstrapper, config, eventBus);
        runtime.registerUIBridge(uiBridge);

        return runtime;
    }

    public static async createRuntimeWithoutInit(configOverride?: any): Promise<AppRuntime> {
        const config = this.createAppConfig(configOverride);

        const nativeBootstrapper = new FakeNativeBootstrapper();
        await nativeBootstrapper.init();
        const runtime = new AppRuntime(nativeBootstrapper.nativeEnvironment, config);

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
            addressGenerationHostnameOverride: globalThis.process.env.NMSHD_TEST_ADDRESS_GENERATION_HOSTNAME_OVERRIDE,
            debug: true
        };

        return runtime_createAppConfig({
            transportLibrary: transportOverride,
            applicationId: "eu.enmeshed.test",
            ...configOverride
        });
    }

    public static async createSession(runtime: AppRuntime): Promise<LocalAccountSession> {
        const localAccount1 = await runtime.accountServices.createAccount("Profil 1");
        return await runtime.selectAccount(localAccount1.id);
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

    public static async provideAccounts(runtime: AppRuntime, count: number): Promise<LocalAccountDTO[]> {
        const accounts: LocalAccountDTO[] = [];

        for (let i = 0; i < count; i++) {
            accounts.push(await runtime.accountServices.createAccount(`Account ${i}`));
        }

        return accounts;
    }

    public static async createAndLoadPeerTemplate(
        from: LocalAccountSession,
        to: LocalAccountSession,
        content: RelationshipTemplateContentDerivation = ArbitraryRelationshipTemplateContent.from({ value: {} }).toJSON()
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
        content: RelationshipCreationContentDerivation = ArbitraryRelationshipCreationContent.from({ value: {} }).toJSON()
    ): Promise<RelationshipDTO> {
        const relRequest = await from.transportServices.relationships.createRelationship({ templateId, creationContent: content });
        return relRequest.value;
    }

    public static async acceptRelationship(session: LocalAccountSession, relationshipId: string): Promise<RelationshipDTO> {
        const acceptedRelationship = (await session.transportServices.relationships.acceptRelationship({ relationshipId })).value;
        return acceptedRelationship;
    }

    public static async rejectRelationship(session: LocalAccountSession, relationshipId: string): Promise<RelationshipDTO> {
        const rejectedRelationship = (await session.transportServices.relationships.rejectRelationship({ relationshipId })).value;
        return rejectedRelationship;
    }

    public static async revokeRelationship(session: LocalAccountSession, relationshipId: string): Promise<RelationshipDTO> {
        const rejectedRelationship = (await session.transportServices.relationships.revokeRelationship({ relationshipId })).value;
        return rejectedRelationship;
    }

    public static async addRelationship(from: LocalAccountSession, to: LocalAccountSession): Promise<{ from: RelationshipDTO; to: RelationshipDTO }> {
        const templateTo = await TestUtil.createAndLoadPeerTemplate(from, to);
        const relationshipTo = await TestUtil.requestRelationshipForTemplate(to, templateTo.id);
        let relationshipFrom = await TestUtil.syncUntilHasRelationship(from, relationshipTo.id);
        relationshipFrom = await TestUtil.acceptRelationship(from, relationshipFrom.id);

        const syncedRelationshipTo = await TestUtil.syncUntilHasRelationship(to, relationshipTo.id);

        return { from: relationshipFrom, to: syncedRelationshipTo };
    }

    public static async addRejectedRelationship(from: LocalAccountSession, to: LocalAccountSession): Promise<{ from: RelationshipDTO; to: RelationshipDTO }> {
        const templateTo = await TestUtil.createAndLoadPeerTemplate(from, to);
        const relationshipTo = await TestUtil.requestRelationshipForTemplate(to, templateTo.id);
        let relationshipFrom = await TestUtil.syncUntilHasRelationship(from, relationshipTo.id);
        relationshipFrom = await TestUtil.rejectRelationship(from, relationshipFrom.id);

        const syncedRelationshipTo = await TestUtil.syncUntilHasRelationship(to, relationshipTo.id);

        return { from: relationshipFrom, to: syncedRelationshipTo };
    }

    /**
     * SyncEvents in the backbone are only eventually consistent. This means that if you send a message now and
     * get all SyncEvents right after, you cannot rely on getting a NewMessage SyncEvent right away. So instead
     * this method executes the syncEverything()-method of the synchronization controller until the condition
     * specified in the `until` callback is met.
     */
    public static async syncUntil(session: LocalAccountSession, until: (syncResult: SyncEverythingResponse) => boolean): Promise<SyncEverythingResponse> {
        const syncResponse: SyncEverythingResponse = {
            relationships: [],
            messages: [],
            identityDeletionProcesses: []
        };

        let iterationNumber = 0;
        do {
            await sleep(iterationNumber * 25);
            const newSyncResult = await session.transportServices.account.syncEverything();
            syncResponse.messages.push(...newSyncResult.value.messages);
            syncResponse.relationships.push(...newSyncResult.value.relationships);
            syncResponse.identityDeletionProcesses.push(...newSyncResult.value.identityDeletionProcesses);
            iterationNumber++;
        } while (!until(syncResponse) && iterationNumber < 15);
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

    public static async sendMessage(from: LocalAccountSession, to: LocalAccountSession, content?: MessageContentDerivation): Promise<MessageDTO> {
        return await this.sendMessagesWithAttachments(from, [to], [], content);
    }

    public static async sendMessagesWithAttachments(
        from: LocalAccountSession,
        recipients: LocalAccountSession[],
        attachments: string[],
        content?: MessageContentDerivation
    ): Promise<MessageDTO> {
        if (!content) {
            content = ArbitraryMessageContent.from({ value: "TestContent" }).toJSON();
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
            title: "aFileName",
            content: fileContent
        });
        return file.value;
    }

    public static expectSuccess<T>(result: Result<T>): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        expect(result.isSuccess, `${result.error?.code} | ${result.error?.message}`).toBe(true);
    }
}
