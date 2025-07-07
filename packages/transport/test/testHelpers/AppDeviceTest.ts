import { ILogger } from "@js-soft/logging-abstractions";
import { EventEmitter2EventBus } from "@js-soft/ts-utils";
import { createProvider, createProviderFromName, getAllProviders, getProviderCapabilities } from "@nmshd/rs-crypto-node";
import fs from "fs";
import path from "path";
import * as tmp from "tmp";
import { AccountController, ALL_CRYPTO_PROVIDERS, DeviceSharedSecret, Transport } from "../../src";
import { DeviceTestParameters } from "./DeviceTestParameters";
import { TestUtil } from "./TestUtil";

export class AppDeviceTest {
    protected parameters: DeviceTestParameters;

    protected transport: Transport;
    protected logger: ILogger;

    private readonly createdAccounts: AccountController[] = [];

    private static readonly rootTempDir = tmp.dirSync({ unsafeCleanup: true });

    public constructor(parameters: DeviceTestParameters) {
        this.parameters = parameters;
        const transportSpecificDir = fs.mkdtempSync(path.join(AppDeviceTest.rootTempDir.name, "transport-"));

        this.parameters.config.calConfig = {
            factoryFunctions: { getAllProviders, createProvider, createProviderFromName, getProviderCapabilities },
            providersToBeInitialized: ALL_CRYPTO_PROVIDERS.map((name) => [
                { providerName: name },
                {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    additional_config: [
                        {
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            FileStoreConfig: {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                db_dir: path.join(transportSpecificDir, `cal_db_${name}`)
                            }
                        }
                    ]
                }
            ])
        };

        this.transport = new Transport(
            this.parameters.config,
            new EventEmitter2EventBus(() => {
                // ignore errors
            }),
            this.parameters.loggerFactory
        );
    }

    public async init(): Promise<void> {
        await this.transport.init();
    }

    public async createAccount(): Promise<AccountController> {
        const accounts = await TestUtil.provideAccounts(this.transport, this.parameters.connection, 1);

        const account = accounts[0];

        this.createdAccounts.push(account);
        return account;
    }

    public async onboardDevice(sharedSecret: DeviceSharedSecret): Promise<AccountController> {
        const account = await TestUtil.onboardDevice(this.transport, this.parameters.connection, sharedSecret);
        this.createdAccounts.push(account);
        return account;
    }

    public async close(): Promise<void> {
        for (const account of this.createdAccounts) {
            await account.close();
        }
    }
}
