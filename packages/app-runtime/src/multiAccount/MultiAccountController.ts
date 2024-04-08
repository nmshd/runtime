import { IDatabaseCollection, IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { ILogger } from "@js-soft/logging-abstractions";
import {
    AccountController,
    CoreAddress,
    CoreDate,
    CoreId,
    DeviceSharedSecret,
    Realm,
    Transport,
    CoreErrors as TransportCoreErrors,
    TransportLoggerFactory
} from "@nmshd/transport";
import { AppConfig } from "../AppConfig";
import { LocalAccount } from "./data/LocalAccount";

export class MultiAccountController {
    private readonly _log: ILogger;

    private _localAccounts: IDatabaseCollection;

    private _db?: IDatabaseCollectionProvider;
    protected _dbClosed = false;

    private readonly _transport: Transport;
    public get transport(): Transport {
        return this._transport;
    }

    private readonly _path: string;
    public get path(): string {
        return this._path;
    }

    public constructor(
        transport: Transport,
        private readonly config: AppConfig,
        private readonly databaseConnection: LokiJsConnection
    ) {
        this._transport = transport;
        this._log = TransportLoggerFactory.getLogger(MultiAccountController);
    }

    public async init(): Promise<MultiAccountController> {
        this._log.trace("opening accounts DB");
        this._db = await this.transport.createDatabase(this.config.accountsDbName);
        this._log.trace("accounts DB opened.");

        this._dbClosed = false;
        this._localAccounts = await this._db.getCollection("LocalAccounts");
        return this;
    }

    public async close(): Promise<void> {
        await this.closeAccounts();

        if (this._db && !this._dbClosed) {
            this._log.trace(`Closing LokiDB for path ${this.path}`);

            await this._db.close();
            this._dbClosed = true;
        }
    }

    private readonly _openAccounts: AccountController[] = [];
    public get openAccounts(): AccountController[] {
        return this._openAccounts;
    }

    public async getAccount(id: CoreId): Promise<LocalAccount> {
        const dbAccount = await this._localAccounts.read(id.toString());
        if (!dbAccount) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString()).logWith(this._log);
        }

        return LocalAccount.from(dbAccount);
    }

    public async getAccountByAddress(address: string): Promise<LocalAccount> {
        const dbAccount = await this._localAccounts.findOne({ address });
        if (!dbAccount) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, address).logWith(this._log);
        }

        return LocalAccount.from(dbAccount);
    }

    public async getAccounts(): Promise<LocalAccount[]> {
        const dbAccounts = await this._localAccounts.list();
        return dbAccounts.map((account) => LocalAccount.from(account));
    }

    public async selectAccount(id: CoreId, _masterPassword: string): Promise<[LocalAccount, AccountController]> {
        this._log.trace(`Selecting LocalAccount with id ${id}...`);
        const account = await this._localAccounts.read(id.toString());
        if (!account) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString()).logWith(this._log);
        }
        let localAccount: LocalAccount = LocalAccount.from(account);

        this._log.trace(`Opening DB for account ${localAccount.id}...`);
        const db: IDatabaseCollectionProvider = await this.transport.createDatabase(`acc-${localAccount.id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController: AccountController = new AccountController(this.transport, db, this.transport.config);
        await accountController.init();
        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts.push(accountController);

        if (!localAccount.address) {
            // Update address after first login if not set already
            localAccount = await this.updateLocalAccountAddress(localAccount.id, accountController.identity.address);
        }

        return [localAccount, accountController];
    }

    public async deleteAccount(id: CoreId): Promise<void> {
        const account = await this._localAccounts.read(id.toString());
        if (!account) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString()).logWith(this._log);
        }

        const localAccount = LocalAccount.from(account);

        const openedAccount = this._openAccounts.find((a) => a.identity.address.equals(localAccount.address));
        if (openedAccount) {
            await openedAccount.unregisterPushNotificationToken();
            await openedAccount.activeDevice.markAsOffboarded();
            await openedAccount.close();
            this._openAccounts.splice(this._openAccounts.indexOf(openedAccount), 1);
        } else {
            const [, accountController] = await this.selectAccount(id, "");
            await accountController.unregisterPushNotificationToken();
            await accountController.activeDevice.markAsOffboarded();
            await accountController.close();
            this._openAccounts.splice(this._openAccounts.indexOf(accountController), 1);
        }

        await this.databaseConnection.deleteDatabase(`acc-${id.toString()}`);
        await this._localAccounts.delete({ id: id.toString() });
    }

    public async clearAccounts(): Promise<void> {
        await this._localAccounts.delete({});
    }

    public async closeAccounts(): Promise<void> {
        for (let i = 0, l = this._openAccounts.length; i < l; i++) {
            const account = this._openAccounts[i];
            await account.close();
        }
    }

    public async onboardDevice(deviceSharedSecret: DeviceSharedSecret): Promise<[LocalAccount, AccountController]> {
        this._log.trace(`Onboarding device ${deviceSharedSecret.id} for identity ${deviceSharedSecret.identity.address}...`);

        const id = await CoreId.generate();

        let localAccount = LocalAccount.from({
            id,
            address: deviceSharedSecret.identity.address,
            directory: ".",
            realm: deviceSharedSecret.identity.realm,
            name: deviceSharedSecret.name ? deviceSharedSecret.name : deviceSharedSecret.identity.address.toString(),
            order: -1
        });
        await this._localAccounts.create(localAccount);
        this._log.trace("Local account created.");

        this._log.trace(`Opening DB for account ${id}...`);
        const db = await this.transport.createDatabase(`acc-${id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController = new AccountController(this.transport, db, this.transport.config);
        await accountController.init(deviceSharedSecret);
        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts.push(accountController);

        localAccount = await this.updateLocalAccountAddress(localAccount.id, accountController.identity.address);

        return [localAccount, accountController];
    }

    public async createAccount(realm: Realm, name: string): Promise<[LocalAccount, AccountController]> {
        this._log.trace(`Creating account for realm ${realm}.`);
        const id = await CoreId.generate();

        let localAccount = LocalAccount.from({
            id,
            directory: ".",
            realm,
            name,
            order: -1
        });
        await this._localAccounts.create(localAccount);
        this._log.trace("Local account created.");

        this._log.trace(`Opening DB for account ${id}...`);
        const db = await this.transport.createDatabase(`acc-${id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController = new AccountController(this.transport, db, this.transport.config);
        await accountController.init();
        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts.push(accountController);

        localAccount = await this.updateLocalAccountAddress(localAccount.id, accountController.identity.address);

        return [localAccount, accountController];
    }

    private async updateLocalAccountAddress(id: CoreId, address: CoreAddress): Promise<LocalAccount> {
        const oldAccount = await this._localAccounts.read(id.toString());

        if (!oldAccount) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString()).logWith(this._log);
        }

        const account = LocalAccount.from(oldAccount);
        account.address = address;

        await this._localAccounts.update(oldAccount, account);
        return account;
    }

    public async renameLocalAccount(id: CoreId, name: string): Promise<void> {
        const oldAccount = await this._localAccounts.read(id.toString());

        if (!oldAccount) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString()).logWith(this._log);
        }

        const renamedAccount = LocalAccount.from(oldAccount);
        renamedAccount.name = name;

        await this._localAccounts.update(oldAccount, renamedAccount);
    }

    public async updateLastAccessedAt(accountId: string): Promise<void> {
        const document = await this._localAccounts.read(accountId);
        if (!document) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, accountId).logWith(this._log);
        }

        const localAccount = LocalAccount.from(document);
        localAccount.lastAccessedAt = CoreDate.utc();

        await this._localAccounts.update(document, localAccount);
    }
}
