import { ILogger } from "@js-soft/logging-abstractions";
import { EventEmitter2EventBus } from "@js-soft/ts-utils";
import { CryptoLayerConfig } from "@nmshd/crypto";
import { createProvider, createProviderFromName, getAllProviders, getProviderCapabilities } from "@nmshd/rs-crypto-node";
import { AccountController, DeviceSharedSecret, Transport } from "../../src";
import { ALL_CRYPTO_PROVIDERS } from "../../src/core/CryptoProviderMapping";
import { DeviceTestParameters } from "./DeviceTestParameters";
import { TestUtil } from "./TestUtil";

export class AppDeviceTest {
    protected parameters: DeviceTestParameters;

    protected transport: Transport;
    protected logger: ILogger;

    private readonly createdAccounts: AccountController[] = [];

    public constructor(parameters: DeviceTestParameters) {
        this.parameters = parameters;
        const randomDigits = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        const calConfig: CryptoLayerConfig = {
            factoryFunctions: { getAllProviders, createProvider, createProviderFromName, getProviderCapabilities },
            providersToBeInitialized: ALL_CRYPTO_PROVIDERS.map((name) => [
                { providerName: name },
                {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    additional_config: [
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        { StorageConfigPass: "12345678" },
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        { FileStoreConfig: { db_dir: `./testDB/cal_db_${name}_${randomDigits}` } }
                    ]
                }
            ])
        };
        this.transport = new Transport(
            this.parameters.config,
            new EventEmitter2EventBus(() => {
                // ignore errors
            }),
            this.parameters.loggerFactory,
            undefined,
            calConfig
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
