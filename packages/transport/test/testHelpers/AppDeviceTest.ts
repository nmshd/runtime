import { ILogger } from "@js-soft/logging-abstractions";
import { EventEmitter2EventBus } from "@js-soft/ts-utils";
import { AccountController, DeviceSharedSecret, Transport } from "../../src";
import { DeviceTestParameters } from "./DeviceTestParameters";
import { TestUtil } from "./TestUtil";

export class AppDeviceTest {
    protected parameters: DeviceTestParameters;

    protected transport: Transport;
    protected logger: ILogger;

    private readonly createdAccounts: AccountController[] = [];

    public constructor(parameters: DeviceTestParameters) {
        this.parameters = parameters;
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
