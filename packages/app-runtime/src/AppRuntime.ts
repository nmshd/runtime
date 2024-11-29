import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { Result } from "@js-soft/ts-utils";
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
    AppLaunchModule,
    AppRuntimeModuleConfiguration,
    AppSyncModule,
    DatawalletSynchronizedModule,
    IAppRuntimeModuleConstructor,
    IdentityDeletionProcessStatusChangedModule,
    MailReceivedModule,
    MessageReceivedModule,
    OnboardingChangeReceivedModule,
    PushNotificationModule,
    RelationshipChangedModule,
    RelationshipTemplateProcessedModule
} from "./modules";
import { AccountServices, LocalAccountDTO, LocalAccountMapper, LocalAccountSession, MultiAccountController } from "./multiAccount";
import { INativeBootstrapper, INativeEnvironment, INativeTranslationProvider } from "./natives";
import { SessionStorage } from "./SessionStorage";
import { UserfriendlyResult } from "./UserfriendlyResult";

export class AppRuntime extends Runtime<AppConfig> {
    public constructor(
        private readonly _nativeEnvironment: INativeEnvironment,
        appConfig: AppConfig
    ) {
        super(appConfig, _nativeEnvironment.loggerFactory);

        this._stringProcessor = new AppStringProcessor(this, this.loggerFactory);
    }

    public get config(): AppConfig {
        return this.runtimeConfig;
    }

    private _uiBridge: IUIBridge | undefined;
    private _uiBridgeResolver?: { promise: Promise<IUIBridge>; resolve(uiBridge: IUIBridge): void };

    public async uiBridge(): Promise<IUIBridge> {
        if (this._uiBridge) return this._uiBridge;
        if (this._uiBridgeResolver) return await this._uiBridgeResolver.promise;

        let resolve: (uiBridge: IUIBridge) => void = () => "";
        const promise = new Promise<IUIBridge>((r) => (resolve = r));
        this._uiBridgeResolver = { promise, resolve };

        try {
            return await this._uiBridgeResolver.promise;
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

    private lokiConnection: LokiJsConnection;
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

    public async requestAccountSelection(
        title = "i18n://uibridge.accountSelection.title",
        description = "i18n://uibridge.accountSelection.description"
    ): Promise<UserfriendlyResult<LocalAccountDTO | undefined>> {
        const accounts = await this.accountServices.getAccounts();

        const bridge = await this.uiBridge();
        const accountSelectionResult = await bridge.requestAccountSelection(accounts, title, description);
        if (accountSelectionResult.isError) {
            return UserfriendlyResult.fail(AppRuntimeErrors.general.noAccountAvailable(accountSelectionResult.error));
        }

        if (accountSelectionResult.value) await this.selectAccount(accountSelectionResult.value.id);
        return UserfriendlyResult.ok(accountSelectionResult.value);
    }

    public getHealth(): Promise<RuntimeHealth> {
        const health = {
            isHealthy: true,
            services: {}
        };
        return Promise.resolve(health);
    }

    protected async initAccount(): Promise<void> {
        this._multiAccountController = new MultiAccountController(this.transport, this.runtimeConfig, this.lokiConnection, this.sessionStorage);
        await this._multiAccountController.init();
        this._accountServices = new AccountServices(this._multiAccountController);
    }

    public static async create(nativeBootstrapper: INativeBootstrapper, appConfig?: AppConfigOverwrite): Promise<AppRuntime> {
        // TODO: JSSNMSHDD-2524 (validate app config)

        if (!nativeBootstrapper.isInitialized) {
            const result = await nativeBootstrapper.init();
            if (!result.isSuccess) {
                throw AppRuntimeErrors.startup.bootstrapError(result.error);
            }
        }

        const applePushEnvironmentResult = nativeBootstrapper.nativeEnvironment.configAccess.get("applePushEnvironment");
        const applePushEnvironment = applePushEnvironmentResult.isError ? undefined : applePushEnvironmentResult.value;

        const applicationId = nativeBootstrapper.nativeEnvironment.configAccess.get("applicationId").value;
        const transportConfig = nativeBootstrapper.nativeEnvironment.configAccess.get("transport").value;
        const databaseFolder = nativeBootstrapper.nativeEnvironment.configAccess.get("databaseFolder").value;

        const mergedConfig = appConfig
            ? createAppConfig(
                  {
                      transportLibrary: transportConfig,
                      applicationId: applicationId,
                      applePushEnvironment: applePushEnvironment
                  },
                  appConfig
              )
            : createAppConfig({
                  transportLibrary: transportConfig,
                  applicationId: applicationId,
                  applePushEnvironment: applePushEnvironment,
                  databaseFolder: databaseFolder
              });

        const runtime = new AppRuntime(nativeBootstrapper.nativeEnvironment, mergedConfig);
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
        this.lokiConnection = new LokiJsConnection(this.config.databaseFolder, this.nativeEnvironment.databaseFactory);
        this.logger.trace("Finished initialization of LokiJS connection.");

        return Promise.resolve(this.lokiConnection);
    }

    private static moduleRegistry: Record<string, IAppRuntimeModuleConstructor | undefined> = {
        appLaunch: AppLaunchModule,
        appSync: AppSyncModule,
        pushNotification: PushNotificationModule,
        mailReceived: MailReceivedModule,
        onboardingChangeReceived: OnboardingChangeReceivedModule,
        datawalletSynchronized: DatawalletSynchronizedModule,
        identityDeletionProcessStatusChanged: IdentityDeletionProcessStatusChangedModule,
        messageReceived: MessageReceivedModule,
        relationshipChanged: RelationshipChangedModule,
        relationshipTemplateProcessed: RelationshipTemplateProcessedModule
    };

    public static registerModule(moduleName: string, ctor: IAppRuntimeModuleConstructor): void {
        this.moduleRegistry[moduleName] = ctor;
    }

    protected loadModule(moduleConfiguration: ModuleConfiguration): Promise<void> {
        const moduleConstructor = AppRuntime.moduleRegistry[moduleConfiguration.location];
        if (!moduleConstructor) {
            const error = new Error(
                `Module '${this.getModuleName(moduleConfiguration)}' could not be loaded, because it was not registered. Please register all modules before running init.`
            );
            this.logger.error(error);
            return Promise.reject(error);
        }

        const connectorModuleConfiguration = moduleConfiguration as AppRuntimeModuleConfiguration;

        const module = new moduleConstructor(this, connectorModuleConfiguration, this.loggerFactory.getLogger(moduleConstructor));

        this.modules.add(module);

        this.logger.info(`Module '${this.getModuleName(moduleConfiguration)}' was loaded successfully.`);
        return Promise.resolve();
    }

    public override async stop(): Promise<void> {
        const logError = (e: any) => this.logger.error(e);

        await super.stop().catch(logError);
        await this.lokiConnection.close().catch(logError);
    }

    protected override async startApp(): Promise<void> {
        const accounts = await this._multiAccountController.getAccounts();

        for (const account of accounts) {
            const session = await this.selectAccount(account.id.toString());
            const syncResult = await session.transportServices.account.syncDatawallet();

            if (syncResult.isSuccess) continue;
            // TODO: can I check whether the error is a 400?

            const checkDeletionResult = await session.transportServices.account.checkDeletionOfIdentity();

            // TODO: throw adequate error
            if (checkDeletionResult.isError) throw AppRuntimeErrors.startup.bootstrapError(checkDeletionResult.error);

            // TODO: throw adequate error
            if (!checkDeletionResult.value.isDeleted) throw AppRuntimeErrors.startup.bootstrapError(checkDeletionResult.error);

            // TODO: delete all local data
        }

        return;
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
