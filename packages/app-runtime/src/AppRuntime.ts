import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { EventBus, Result } from "@js-soft/ts-utils";
import { ConsumptionController } from "@nmshd/consumption";
import { CoreId, ICoreAddress } from "@nmshd/core-types";
import { ModuleConfiguration, Runtime, RuntimeHealth } from "@nmshd/runtime";
import { AccountController } from "@nmshd/transport";
import { AppConfig, AppConfigOverwrite, createAppConfig } from "./AppConfig";
import { AppRuntimeErrors } from "./AppRuntimeErrors";
import { AppRuntimeServices } from "./AppRuntimeServices";
import { AppStringProcessor } from "./AppStringProcessor";
import { AccountSelectedEvent } from "./events";
import { AppServices, IUIBridge } from "./extensibility";
import {
    AppRuntimeModuleConfiguration,
    AppSyncModule,
    IAppRuntimeModuleConstructor,
    IdentityDeletionProcessStatusChangedModule,
    MailReceivedModule,
    MessageReceivedModule,
    OnboardingChangeReceivedModule,
    PushNotificationModule,
    RelationshipChangedModule,
    RelationshipTemplateProcessedModule,
    SSEModule
} from "./modules";
import { AccountServices, LocalAccountMapper, LocalAccountSession, MultiAccountController } from "./multiAccount";
import { INativeBootstrapper, INativeEnvironment, INativeTranslationProvider } from "./natives";
import { SessionStorage } from "./SessionStorage";
import { UserfriendlyResult } from "./UserfriendlyResult";

export class AppRuntime extends Runtime<AppConfig> {
    public constructor(
        private readonly _nativeEnvironment: INativeEnvironment,
        appConfig: AppConfig,
        eventBus?: EventBus
    ) {
        super(appConfig, _nativeEnvironment.loggerFactory, eventBus);

        this._stringProcessor = new AppStringProcessor(this, this.loggerFactory);
    }

    public get config(): AppConfig {
        return this.runtimeConfig;
    }

    private _uiBridge: IUIBridge | undefined;
    private _uiBridgeResolver?: { promise: Promise<IUIBridge>; resolve(uiBridge: IUIBridge): void };

    public uiBridge(): Promise<IUIBridge> | IUIBridge {
        if (this._uiBridge) return this._uiBridge;

        if (this._uiBridgeResolver) return this._uiBridgeResolver.promise;

        let resolve: (uiBridge: IUIBridge) => void = () => "";
        const promise = new Promise<IUIBridge>((r) => (resolve = r));
        this._uiBridgeResolver = { promise, resolve };

        try {
            return this._uiBridgeResolver.promise;
        } finally {
            this._uiBridgeResolver = undefined;
        }
    }

    public registerUIBridge(uiBridge: IUIBridge): UserfriendlyResult<void> {
        if (this._uiBridge) return UserfriendlyResult.fail(AppRuntimeErrors.startup.uiBridgeAlreadyRegistered());

        this._uiBridge = uiBridge;
        this._uiBridgeResolver?.resolve(uiBridge);

        return UserfriendlyResult.ok(undefined);
    }

    protected override readonly databaseConnection: LokiJsConnection;
    private _multiAccountController: MultiAccountController;
    public get multiAccountController(): MultiAccountController {
        return this._multiAccountController;
    }

    private _accountServices: AccountServices;
    public get accountServices(): AccountServices {
        return this._accountServices;
    }

    public get nativeEnvironment(): INativeEnvironment {
        return this._nativeEnvironment;
    }

    private readonly sessionStorage = new SessionStorage();

    public getSessions(): LocalAccountSession[] {
        return this.sessionStorage.getSessions();
    }

    private readonly _stringProcessor: AppStringProcessor;
    public get stringProcessor(): AppStringProcessor {
        return this._stringProcessor;
    }

    protected override async login(accountController: AccountController, consumptionController: ConsumptionController): Promise<AppRuntimeServices> {
        const services = await super.login(accountController, consumptionController);

        const appServices = new AppServices(this, services.transportServices, services.consumptionServices, services.dataViewExpander);

        return { ...services, appServices };
    }

    public async getServices(accountReference: string | ICoreAddress): Promise<AppRuntimeServices> {
        const session = await this.getOrCreateSession(accountReference.toString());

        return {
            transportServices: session.transportServices,
            consumptionServices: session.consumptionServices,
            appServices: session.appServices,
            dataViewExpander: session.expander
        };
    }

    public async selectAccount(accountReference: string): Promise<LocalAccountSession> {
        const session = await this.getOrCreateSession(accountReference);
        this.sessionStorage.currentSession = session;
        this.eventBus.publish(new AccountSelectedEvent(session.address, session.account.id));

        await this.multiAccountController.updateLastAccessedAt(session.account.id);

        return session;
    }

    public async getOrCreateSession(accountReference: string): Promise<LocalAccountSession> {
        const existingSession = this.sessionStorage.findSession(accountReference);
        if (existingSession) {
            return existingSession;
        }

        return await this.createSession(accountReference);
    }

    private currentSessionPromise: { promise: Promise<LocalAccountSession>; accountId: string } | undefined;
    private async createSession(accountReference: string): Promise<LocalAccountSession> {
        const accountId = accountReference.length === 20 ? accountReference : (await this.multiAccountController.getAccountByAddress(accountReference)).id.toString();

        if (this.currentSessionPromise?.accountId === accountId) {
            return await this.currentSessionPromise.promise;
        }

        if (this.currentSessionPromise) {
            await this.currentSessionPromise.promise.catch(() => {
                // ignore
            });

            return await this.createSession(accountId);
        }

        this.currentSessionPromise = { promise: this._createSession(accountId), accountId };

        try {
            return await this.currentSessionPromise.promise;
        } finally {
            this.currentSessionPromise = undefined;
        }
    }

    private async _createSession(accountId: string) {
        const [localAccount, accountController] = await this._multiAccountController.selectAccount(CoreId.from(accountId));
        if (!localAccount.address) {
            throw AppRuntimeErrors.general.addressUnavailable().logWith(this.logger);
        }

        const consumptionController = await new ConsumptionController(this.transport, accountController, { setDefaultRepositoryAttributes: true }).init();

        const services = await this.login(accountController, consumptionController);

        this.logger.debug(`Finished login to ${accountId}.`);
        const session: LocalAccountSession = {
            address: localAccount.address.toString(),
            account: LocalAccountMapper.toLocalAccountDTO(localAccount),
            consumptionServices: services.consumptionServices,
            transportServices: services.transportServices,
            expander: services.dataViewExpander,
            appServices: services.appServices,
            accountController,
            consumptionController
        };

        this.sessionStorage.addSession(session);

        return session;
    }

    public getHealth(): Promise<RuntimeHealth> {
        const health = {
            isHealthy: true,
            services: {}
        };
        return Promise.resolve(health);
    }

    protected async initAccount(): Promise<void> {
        this._multiAccountController = new MultiAccountController(this.transport, this.runtimeConfig, this.databaseConnection, this.sessionStorage);
        await this._multiAccountController.init();
        this._accountServices = new AccountServices(this._multiAccountController);
    }

    public static async create(nativeBootstrapper: INativeBootstrapper, appConfig: AppConfigOverwrite | AppConfig = {}, eventBus?: EventBus): Promise<AppRuntime> {
        // TODO: JSSNMSHDD-2524 (validate app config)

        if (!nativeBootstrapper.isInitialized) {
            const result = await nativeBootstrapper.init();
            if (!result.isSuccess) {
                throw AppRuntimeErrors.startup.bootstrapError(result.error);
            }
        }

        const mergedConfig = createAppConfig(appConfig);

        const runtime = new AppRuntime(nativeBootstrapper.nativeEnvironment, mergedConfig, eventBus);
        await runtime.init();
        runtime.logger.trace("Runtime initialized");

        return runtime;
    }

    public static async createAndStart(nativeBootstrapper: INativeBootstrapper, appConfig?: AppConfigOverwrite): Promise<AppRuntime> {
        const runtime = await this.create(nativeBootstrapper, appConfig);
        await runtime.start();
        runtime.logger.trace("Runtime started");
        return runtime;
    }

    protected createDatabaseConnection(): Promise<IDatabaseConnection> {
        this.logger.trace("Creating DatabaseConnection to LokiJS");
        const lokiConnection = new LokiJsConnection(this.config.databaseFolder, this.nativeEnvironment.databaseFactory);
        this.logger.trace("Finished initialization of LokiJS connection.");

        return Promise.resolve(lokiConnection);
    }

    private static moduleRegistry: Record<string, IAppRuntimeModuleConstructor | undefined> = {
        appSync: AppSyncModule,
        identityDeletionProcessStatusChanged: IdentityDeletionProcessStatusChangedModule,
        mailReceived: MailReceivedModule,
        messageReceived: MessageReceivedModule,
        onboardingChangeReceived: OnboardingChangeReceivedModule,
        pushNotification: PushNotificationModule,
        relationshipChanged: RelationshipChangedModule,
        relationshipTemplateProcessed: RelationshipTemplateProcessedModule,
        sse: SSEModule
    };

    public static registerModule(moduleName: string, ctor: IAppRuntimeModuleConstructor): void {
        this.moduleRegistry[moduleName] = ctor;
    }

    protected loadModule(moduleConfiguration: ModuleConfiguration): Promise<void> {
        const moduleConstructor = AppRuntime.moduleRegistry[moduleConfiguration.location];
        if (!moduleConstructor) {
            const error = new Error(
                `Module at location '${moduleConfiguration.location}' could not be loaded, because it was not registered. Please register all modules before running init. Available modules: ${Object.keys(
                    AppRuntime.moduleRegistry
                ).join(", ")}`
            );
            this.logger.error(error);
            return Promise.reject(error);
        }

        const connectorModuleConfiguration = moduleConfiguration as AppRuntimeModuleConfiguration;

        const module = new moduleConstructor(this, connectorModuleConfiguration, this.loggerFactory.getLogger(moduleConstructor));

        this.modules.add(module);

        this.logger.info(`Module '${module.displayName}' was loaded successfully.`);
        return Promise.resolve();
    }

    public override async start(): Promise<void> {
        await super.start();

        await this.startAccounts();
    }

    public override async stop(): Promise<void> {
        const logError = (e: any) => this.logger.error(e);

        await super.stop().catch(logError);
        await this.databaseConnection.close().catch(logError);
    }

    private async startAccounts(): Promise<void> {
        const accounts = await this._multiAccountController.getAccounts();

        for (const account of accounts) {
            const session = await this.getOrCreateSession(account.id.toString());

            session.accountController.authenticator.clear();
            try {
                await session.accountController.authenticator.getToken();
                continue;
            } catch (error) {
                this.logger.info(error);

                if (!(typeof error === "object" && error !== null && "code" in error)) {
                    continue;
                }

                if (!(error.code === "error.transport.request.noAuthGrant")) continue;
            }

            const checkDeletionResult = await session.transportServices.account.checkIfIdentityIsDeleted();

            if (checkDeletionResult.isError) {
                this.logger.error(checkDeletionResult.error);
                continue;
            }

            if (checkDeletionResult.value.isDeleted) {
                await this._multiAccountController.deleteAccount(account.id);
                continue;
            }

            const syncResult = await session.transportServices.account.syncDatawallet();
            if (syncResult.isError) this.logger.error(syncResult.error);
        }
    }

    private translationProvider: INativeTranslationProvider = {
        translate: (key: string) => Promise.resolve(Result.ok(key))
    };

    public registerTranslationProvider(provider: INativeTranslationProvider): void {
        this.translationProvider = provider;
    }

    public async translate(key: string, ...values: any[]): Promise<Result<string>> {
        return await this.translationProvider.translate(key, ...values);
    }
}
