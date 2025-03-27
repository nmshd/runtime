import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { ConsumptionConfig, ConsumptionController, GenericRequestItemProcessor } from "@nmshd/consumption";
import { ICoreAddress } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { ConsumptionServices, DataViewExpander, ModuleConfiguration, Runtime, RuntimeConfig, RuntimeHealth, RuntimeServices, TransportServices } from "../../src";
import { AbstractCorrelator } from "../../src/useCases/common/AbstractCorrelator";
import { MockEventBus } from "./MockEventBus";
import { TestNotificationItem, TestNotificationItemProcessor } from "./TestNotificationItem";
import { TestRequestItem } from "./TestRequestItem";

export class TestRuntime extends Runtime {
    private dbConnection?: MongoDbConnection | LokiJsConnection;

    private _transportServices: TransportServices;
    private _consumptionServices: ConsumptionServices;
    private _dataViewExpander: DataViewExpander;

    public constructor(
        runtimeConfig: RuntimeConfig,
        private readonly consumptionConfig: ConsumptionConfig,
        correlator?: AbstractCorrelator
    ) {
        super(
            runtimeConfig,
            new NodeLoggerFactory({
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
            }),
            new MockEventBus(),
            correlator
        );
    }

    public override get eventBus(): MockEventBus {
        return super.eventBus as MockEventBus;
    }

    public async getServices(address: string | ICoreAddress): Promise<RuntimeServices> {
        // allow empty address to be passed (this is used in the RuntimeServiceProvider to create the services)
        // when an actual address is passed, it must match the current Runtime's address
        if (address !== "") {
            const currentAddress = (await this._transportServices.account.getIdentityInfo()).value.address;

            const givenAddressString = typeof address === "string" ? address : address.address;
            // eslint-disable-next-line jest/no-standalone-expect
            expect(givenAddressString).toStrictEqual(currentAddress);
        }

        return {
            transportServices: this._transportServices,
            consumptionServices: this._consumptionServices,
            dataViewExpander: this._dataViewExpander
        };
    }

    protected async createDatabaseConnection(): Promise<IDatabaseConnection> {
        if (this.dbConnection) {
            throw new Error("DbConnection already created");
        }

        if (process.env.USE_LOKIJS === "true") {
            this.dbConnection = LokiJsConnection.inMemory();
        } else {
            this.dbConnection = new MongoDbConnection(process.env.CONNECTION_STRING!);
            await this.dbConnection.connect();
        }

        return this.dbConnection;
    }

    protected async initAccount(): Promise<void> {
        const randomAccountName = Math.random().toString(36).substring(7);
        const db = await this.transport.createDatabase(`acc-${randomAccountName}`);

        const accountController = await new AccountController(this.transport, db, this.transport.config).init();

        const requestItemProcessorOverrides = new Map([[TestRequestItem, GenericRequestItemProcessor]]);
        const notificationItemProcessorOverrides = new Map([[TestNotificationItem, TestNotificationItemProcessor]]);
        const consumptionController = await new ConsumptionController(this.transport, accountController, this.consumptionConfig).init(
            requestItemProcessorOverrides,
            notificationItemProcessorOverrides
        );

        ({
            transportServices: this._transportServices,
            consumptionServices: this._consumptionServices,
            dataViewExpander: this._dataViewExpander
        } = await this.login(accountController, consumptionController));
    }

    public getHealth(): Promise<RuntimeHealth> {
        return Promise.resolve({ isHealthy: true, services: {} });
    }

    protected loadModule(_moduleConfiguration: ModuleConfiguration): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public override async stop(): Promise<void> {
        if (this.isInitialized) {
            try {
                await super.stop();
            } catch (e) {
                this.logger.error(e);
            }
        }

        await this.dbConnection?.close();
    }
}

export class NoLoginTestRuntime extends TestRuntime {
    public constructor(runtimeConfig: RuntimeConfig) {
        super(runtimeConfig, { setDefaultRepositoryAttributes: false });
    }

    protected override async initAccount(): Promise<void> {
        // Do not login
    }
}
