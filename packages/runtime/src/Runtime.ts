import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { EventBus, EventEmitter2EventBus } from "@js-soft/ts-utils";
import {
    AttributeListenersController,
    AttributesController,
    ConsumptionController,
    DraftsController,
    IdentityMetadataController,
    IncomingRequestsController,
    NotificationsController,
    OutgoingRequestsController,
    SettingsController
} from "@nmshd/consumption";
import { ICoreAddress } from "@nmshd/core-types";
import {
    AccountController,
    AnonymousTokenController,
    BackboneCompatibilityController,
    ChallengeController,
    DeviceController,
    DevicesController,
    FileController,
    IConfigOverwrite,
    IdentityController,
    IdentityDeletionProcessController,
    MessageController,
    PublicRelationshipTemplateReferencesController,
    RelationshipsController,
    RelationshipTemplateController,
    TokenController,
    Transport
} from "@nmshd/transport";
import { Container, Scope } from "@nmshd/typescript-ioc";
import { buildInformation } from "./buildInformation";
import { DatabaseSchemaUpgrader } from "./DatabaseSchemaUpgrader";
import { DataViewExpander } from "./dataViews";
import { ModulesInitializedEvent, ModulesLoadedEvent, ModulesStartedEvent, RuntimeInitializedEvent, RuntimeInitializingEvent } from "./events";
import { EventProxy } from "./events/EventProxy";
import { AnonymousServices, ConsumptionServices, ModuleConfiguration, RuntimeModuleRegistry, TransportServices } from "./extensibility";
import { AttributeListenerModule, DeciderModule, MessageModule, NotificationModule, RequestModule } from "./modules";
import { RuntimeConfig } from "./RuntimeConfig";
import { RuntimeLoggerFactory } from "./RuntimeLoggerFactory";
import { RuntimeHealth } from "./types";
import { RuntimeErrors } from "./useCases";
import { AbstractCorrelator } from "./useCases/common/AbstractCorrelator";
import { SchemaRepository } from "./useCases/common/SchemaRepository";

export interface RuntimeServices {
    transportServices: TransportServices;
    consumptionServices: ConsumptionServices;
    dataViewExpander: DataViewExpander;
}

export abstract class Runtime<TConfig extends RuntimeConfig = RuntimeConfig> {
    private readonly _logger: ILogger;
    protected get logger(): ILogger {
        return this._logger;
    }

    protected databaseConnection: IDatabaseConnection;
    protected transport: Transport;

    private _anonymousServices: AnonymousServices;
    public get anonymousServices(): AnonymousServices {
        return this._anonymousServices;
    }

    private _accountController?: AccountController;
    private _consumptionController?: ConsumptionController;

    protected isLoggedIn(): boolean {
        return !!this._accountController;
    }

    protected getAccountController(): AccountController {
        if (!this._accountController) throw RuntimeErrors.startup.noActiveAccount();
        return this._accountController;
    }

    protected getConsumptionController(): ConsumptionController {
        if (!this._consumptionController) throw RuntimeErrors.startup.noActiveConsumptionController();
        return this._consumptionController;
    }

    protected async login(accountController: AccountController, consumptionController: ConsumptionController): Promise<RuntimeServices> {
        this._accountController = accountController;
        this._consumptionController = consumptionController;

        const transportServices = Container.get<TransportServices>(TransportServices);
        const consumptionServices = Container.get<ConsumptionServices>(ConsumptionServices);

        const dataViewExpander = Container.get<DataViewExpander>(DataViewExpander);

        await new DatabaseSchemaUpgrader(accountController, consumptionController, this.loggerFactory).upgradeSchemaVersion();

        return { transportServices, consumptionServices, dataViewExpander };
    }

    private _modules: RuntimeModuleRegistry;
    public get modules(): RuntimeModuleRegistry {
        return this._modules;
    }

    public abstract getServices(address: string | ICoreAddress): RuntimeServices | Promise<RuntimeServices>;

    private readonly _eventBus: EventBus;
    public get eventBus(): EventBus {
        return this._eventBus;
    }

    private _eventProxy: EventProxy;

    public constructor(
        protected runtimeConfig: TConfig,
        protected loggerFactory: ILoggerFactory,
        eventBus?: EventBus,
        protected correlator?: AbstractCorrelator
    ) {
        this._logger = this.loggerFactory.getLogger(this.constructor.name);

        this._eventBus =
            eventBus ??
            new EventEmitter2EventBus((error, namespace) => {
                this.logger.error(`An error was thrown in an event handler of the Runtime event bus (namespace: '${namespace}'). Root error: ${error}`);
            });
    }

    private _isInitialized = false;
    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    public async init(): Promise<void> {
        if (this._isInitialized) {
            throw RuntimeErrors.general.alreadyInitialized();
        }

        this.eventBus.publish(new RuntimeInitializingEvent());

        await this.initDIContainer();

        this.databaseConnection = await this.createDatabaseConnection();

        await this.initTransportLibrary();
        await this.initAccount();

        this._modules = new RuntimeModuleRegistry();
        await this.loadModules();
        await this.initInfrastructure();
        await this.initModules();

        this._eventProxy = new EventProxy(this._eventBus, this.transport.eventBus).start();

        this._isInitialized = true;
        this.eventBus.publish(new RuntimeInitializedEvent());
    }

    protected initInfrastructure(): void | Promise<void> {
        return;
    }

    protected abstract createDatabaseConnection(): Promise<IDatabaseConnection>;

    protected abstract initAccount(): Promise<void>;

    public abstract getHealth(): Promise<RuntimeHealth>;

    public async getSupportInformation(): Promise<{ health: RuntimeHealth; configuration: TConfig }> {
        const health = await this.getHealth();
        const config = JSON.parse(JSON.stringify(this.runtimeConfig)) as TConfig;

        return {
            health: health,
            configuration: config
        };
    }

    private async initTransportLibrary() {
        this.logger.debug("Initializing Database connection... ");

        const transportConfig = this.createTransportConfigWithAdditionalHeaders({
            ...this.runtimeConfig.transportLibrary,
            supportedIdentityVersion: 1
        });

        const eventBus = new EventEmitter2EventBus((error, namespace) => {
            this.logger.error(`An error was thrown in an event handler of the transport event bus (namespace: '${namespace}'). Root error: ${error}`);
        });

        this.transport = new Transport(transportConfig, eventBus, this.loggerFactory, this.correlator);

        this.logger.debug("Initializing Transport Library...");
        await this.transport.init();
        this.logger.debug("Finished initialization of Transport Library.");

        this._anonymousServices = Container.get<AnonymousServices>(AnonymousServices);
    }

    private createTransportConfigWithAdditionalHeaders(originalTransportConfig: IConfigOverwrite): IConfigOverwrite {
        const platformAdditionalHeaders = originalTransportConfig.platformAdditionalHeaders ?? {};

        platformAdditionalHeaders["X-RUNTIME-VERSION"] = buildInformation.version;

        return { ...originalTransportConfig, platformAdditionalHeaders };
    }

    private async initDIContainer() {
        if (this.correlator) {
            Container.bind(AbstractCorrelator)
                .factory(() => this.correlator!)
                .scope(Scope.Request);
        }

        Container.bind(EventBus)
            .factory(() => this.eventBus)
            .scope(Scope.Singleton);

        Container.bind(RuntimeLoggerFactory)
            .factory(() => this.loggerFactory)
            .scope(Scope.Singleton);

        Container.bind(AccountController)
            .factory(() => this.getAccountController())
            .scope(Scope.Request);

        Container.bind(DevicesController)
            .factory(() => this.getAccountController().devices)
            .scope(Scope.Request);

        Container.bind(DeviceController)
            .factory(() => this.getAccountController().activeDevice)
            .scope(Scope.Request);

        Container.bind(FileController)
            .factory(() => this.getAccountController().files)
            .scope(Scope.Request);

        Container.bind(IdentityController)
            .factory(() => this.getAccountController().identity)
            .scope(Scope.Request);

        Container.bind(IdentityDeletionProcessController)
            .factory(() => this.getAccountController().identityDeletionProcess)
            .scope(Scope.Request);

        Container.bind(MessageController)
            .factory(() => this.getAccountController().messages)
            .scope(Scope.Request);

        Container.bind(RelationshipTemplateController)
            .factory(() => this.getAccountController().relationshipTemplates)
            .scope(Scope.Request);

        Container.bind(RelationshipsController)
            .factory(() => this.getAccountController().relationships)
            .scope(Scope.Request);

        Container.bind(TokenController)
            .factory(() => this.getAccountController().tokens)
            .scope(Scope.Request);

        Container.bind(PublicRelationshipTemplateReferencesController)
            .factory(() => this.getAccountController().publicRelationshipTemplateReferences)
            .scope(Scope.Request);

        Container.bind(ChallengeController)
            .factory(() => this.getAccountController().challenges)
            .scope(Scope.Request);

        Container.bind(ConsumptionController)
            .factory(() => this.getConsumptionController())
            .scope(Scope.Request);

        Container.bind(AttributesController)
            .factory(() => this.getConsumptionController().attributes)
            .scope(Scope.Request);

        Container.bind(AttributeListenersController)
            .factory(() => this.getConsumptionController().attributeListeners)
            .scope(Scope.Request);

        Container.bind(DraftsController)
            .factory(() => this.getConsumptionController().drafts)
            .scope(Scope.Request);

        Container.bind(IncomingRequestsController)
            .factory(() => this.getConsumptionController().incomingRequests)
            .scope(Scope.Request);

        Container.bind(OutgoingRequestsController)
            .factory(() => this.getConsumptionController().outgoingRequests)
            .scope(Scope.Request);

        Container.bind(SettingsController)
            .factory(() => this.getConsumptionController().settings)
            .scope(Scope.Request);

        Container.bind(IdentityMetadataController)
            .factory(() => this.getConsumptionController().identityMetadata)
            .scope(Scope.Request);

        Container.bind(NotificationsController)
            .factory(() => this.getConsumptionController().notifications)
            .scope(Scope.Request);

        Container.bind(AnonymousTokenController)
            .factory(() => new AnonymousTokenController(this.transport.config, this.correlator))
            .scope(Scope.Singleton);

        Container.bind(BackboneCompatibilityController)
            .factory(() => new BackboneCompatibilityController(this.transport.config, this.correlator))
            .scope(Scope.Singleton);

        const schemaRepository = new SchemaRepository();
        await schemaRepository.loadSchemas();
        Container.bind(SchemaRepository)
            .factory(() => schemaRepository)
            .scope(Scope.Singleton);
    }

    private async loadModules() {
        this.logger.info("Loading modules...");

        for (const key in this.runtimeConfig.modules) {
            const moduleConfiguration = this.runtimeConfig.modules[key];

            if (!moduleConfiguration.enabled) {
                this.logger.debug(`Skip loading module at location '${moduleConfiguration.location}' because it is not enabled.`);
                continue;
            }

            if (!moduleConfiguration.location) {
                this.logger.error(`Skip loading module because the location '${moduleConfiguration.location}' is invalid.`);
                continue;
            }

            // load the builtin '@nmshd/runtime' modules based on their specifier after the colon
            if (moduleConfiguration.location.startsWith("@nmshd/runtime:")) {
                this.loadBuiltinModule(moduleConfiguration);
                continue;
            }

            await this.loadModule(moduleConfiguration);
        }

        // iterate modules and check if they are allowed to be loaded multiple times
        for (const module of this.modules.toArray()) {
            if (!(module.constructor as Function & { denyMultipleInstances: boolean }).denyMultipleInstances) return;

            const instances = this.modules.toArray().filter((m) => m.constructor === module.constructor);
            if (instances.length === 1) continue;

            throw new Error(
                `The Module '${module.displayName}' at location '${module.configuration.location}' is not allowed to be used multiple times, but has ${instances.length} instances.`
            );
        }

        this.eventBus.publish(new ModulesLoadedEvent());
    }

    private loadBuiltinModule(moduleConfiguration: ModuleConfiguration) {
        const moduleSpecifier = moduleConfiguration.location.split(":")[1];

        switch (moduleSpecifier) {
            case "DeciderModule":
                const deciderModule = new DeciderModule(this, moduleConfiguration, this.loggerFactory.getLogger(DeciderModule));
                this.modules.add(deciderModule);
                break;
            case "RequestModule":
                const requestModule = new RequestModule(this, moduleConfiguration, this.loggerFactory.getLogger(RequestModule));
                this.modules.add(requestModule);
                break;
            case "MessageModule":
                const messageModule = new MessageModule(this, moduleConfiguration, this.loggerFactory.getLogger(MessageModule));
                this.modules.add(messageModule);
                break;
            case "AttributeListenerModule":
                const attributeListenerModule = new AttributeListenerModule(this, moduleConfiguration, this.loggerFactory.getLogger(AttributeListenerModule));
                this.modules.add(attributeListenerModule);
                break;
            case "NotificationModule":
                const notificationModule = new NotificationModule(this, moduleConfiguration, this.loggerFactory.getLogger(NotificationModule));
                this.modules.add(notificationModule);
                break;
            default:
                throw new Error(`Module ${moduleConfiguration.location} is not a builtin module.`);
        }
    }

    protected abstract loadModule(moduleConfiguration: ModuleConfiguration): Promise<void>;

    private async initModules() {
        this.logger.info("Initializing modules...");

        for (const module of this.modules.toArray()) {
            try {
                await module.init();
                this.logger.info(`Module '${module.displayName}' was initialized successfully.`);
            } catch (e) {
                this.logger.error(`Module '${module.displayName}' could not be initialized.`, e);
                throw e;
            }
        }

        this.eventBus.publish(new ModulesInitializedEvent());
    }

    private _isStarted = false;
    public get isStarted(): boolean {
        return this._isStarted;
    }

    public async start(): Promise<void> {
        if (!this._isInitialized) {
            throw RuntimeErrors.general.notInitialized();
        }

        if (this._isStarted) {
            throw RuntimeErrors.general.alreadyStarted();
        }

        await this.startInfrastructure();
        await this.startModules();

        this._isStarted = true;
    }

    protected startInfrastructure(): void | Promise<void> {
        return;
    }

    protected async stop(): Promise<void> {
        if (!this._isInitialized) {
            throw RuntimeErrors.general.notInitialized();
        }

        if (!this._isStarted) {
            throw RuntimeErrors.general.notStarted();
        }

        await this.stopModules();
        await this.stopInfrastructure();

        await this.transport.eventBus.close();
        this._eventProxy.stop();
        await this._eventBus.close();

        this.logger.info("Closing AccountController...");
        await this._accountController?.close();
        this._accountController = undefined;
        this.logger.info("AccountController was closed successfully.");

        this._isInitialized = false;
        this._isStarted = false;
    }

    protected stopInfrastructure(): void | Promise<void> {
        return;
    }

    private async stopModules() {
        this.logger.info("Stopping modules...");

        for (const module of this.modules.toArray()) {
            try {
                await module.stop();
                this.logger.info(`Module '${module.displayName}' was stopped successfully.`);
            } catch (e) {
                this.logger.error(`An Error occured while stopping module '${module.displayName}': `, e);
            }
        }

        this.logger.info("Stopped all modules.");
    }

    private async startModules() {
        this.logger.info("Starting modules...");

        for (const module of this.modules.toArray()) {
            try {
                await module.start();
                this.logger.info(`Module '${module.displayName}' was started successfully.`);
            } catch (e) {
                this.logger.error(`Module '${module.displayName}' could not be started.`, e);
                throw e;
            }
        }

        this.eventBus.publish(new ModulesStartedEvent());
        this.logger.info("Started all modules.");
    }
}
