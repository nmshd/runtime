import { IDatabaseCollection, IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { ILogger } from "@js-soft/logging-abstractions";
import { CoreAddress, CoreDate, CoreError, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { AccountController, DeviceSharedSecret, Transport, TransportCoreErrors, TransportLoggerFactory } from "@nmshd/transport";
import { AppConfig } from "../AppConfig";
import { SessionStorage } from "../SessionStorage";
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
        private readonly databaseConnection: LokiJsConnection,
        private readonly sessionStorage: SessionStorage
    ) {
        this._transport = transport;
        this._log = TransportLoggerFactory.getLogger(MultiAccountController);
    }

    public async init(): Promise<MultiAccountController> {
        this._log.trace("opening accounts DB");
        this._db = await this.databaseConnection.getDatabase(this.config.accountsDbName);
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

    private readonly _openAccounts: Record<string, AccountController | undefined> = {};

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
        return await this._findAccounts();
    }

    public async getAccountsInDeletion(): Promise<LocalAccount[]> {
        return await this._findAccounts({ deletionDate: { $exists: true } });
    }

    public async getAccountsNotInDeletion(): Promise<LocalAccount[]> {
        return await this._findAccounts({ deletionDate: { $exists: false } });
    }

    private async _findAccounts(query?: any) {
        const accounts = await this._localAccounts.find(query);
        return accounts.map((account) => LocalAccount.from(account));
    }

    public async selectAccount(id: CoreId): Promise<[LocalAccount, AccountController]> {
        this._log.trace(`Selecting LocalAccount with id ${id}...`);
        const account = await this._localAccounts.read(id.toString());
        if (!account) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, id.toString());
        }
        let localAccount: LocalAccount = LocalAccount.from(account);

        if (this._openAccounts[localAccount.id.toString()]) {
            return [localAccount, this._openAccounts[localAccount.id.toString()]!];
        }

        this._log.trace(`Opening DB for account ${localAccount.id}...`);
        const db = await this.databaseConnection.getDatabase(`acc-${localAccount.id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController = new AccountController(this.transport, db, this.transport.config);

        await accountController.init().catch((error) => {
            if (error instanceof CoreError && TransportCoreErrors.general.accountControllerInitialSyncFailed().equals(error)) {
                this._log.error(`Initial sync of AccountController for local account ${id} failed.`, error);
                return;
            }

            throw error;
        });

        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts[localAccount.id.toString()] = accountController;

        if (!localAccount.address) {
            // Update address after first login if not set already
            localAccount = await this.updateLocalAccountAddress(localAccount.id, accountController.identity.address);
        }

        return [localAccount, accountController];
    }

    public async offboardAccount(id: CoreId): Promise<void> {
        const [_, accountController] = await this.selectAccount(id);
        await accountController.unregisterPushNotificationToken();
        await accountController.activeDevice.markAsOffboarded();
        await accountController.close();

        await this.deleteAccount(id);
    }

    public async deleteAccount(id: CoreId): Promise<void> {
        delete this._openAccounts[id.toString()];

        await this.databaseConnection.deleteDatabase(`acc-${id.toString()}`);
        await this._localAccounts.delete({ id: id.toString() });
        this.sessionStorage.removeSession(id.toString());
    }

    public async clearAccounts(): Promise<void> {
        await this._localAccounts.delete({});
    }

    public async closeAccounts(): Promise<void> {
        for (const account of Object.values(this._openAccounts)) {
            await account?.close();
        }
    }

    public async onboardDevice(deviceSharedSecret: DeviceSharedSecret, name?: string): Promise<[LocalAccount, AccountController]> {
        const existingAccounts = await this._localAccounts.find({ address: deviceSharedSecret.identity.address.toString() });
        if (existingAccounts.length > 0 && !this.config.allowMultipleAccountsWithSameAddress) {
            throw new CoreError(
                "error.app-runtime.onboardedAccountAlreadyExists",
                `An account with the address '${deviceSharedSecret.identity.address.toString()}' already exists in this app-runtime instance.`
            );
        }

        this._log.trace(`Onboarding device ${deviceSharedSecret.id} for identity ${deviceSharedSecret.identity.address}...`);

        const id = await CoreIdHelper.notPrefixed.generate();

        const localAccount = LocalAccount.from({
            id,
            address: deviceSharedSecret.identity.address,
            directory: ".",
            name: name ?? deviceSharedSecret.name ?? deviceSharedSecret.identity.address.toString(),
            order: -1
        });
        await this._localAccounts.create(localAccount);
        this._log.trace("Local account created.");

        this._log.trace(`Opening DB for account ${id}...`);
        const db = await this.databaseConnection.getDatabase(`acc-${id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController = new AccountController(this.transport, db, this.transport.config);
        await accountController.init(deviceSharedSecret);
        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts[id.toString()] = accountController;

        const updatedLocalAccount = await this.updateLocalAccountAddress(localAccount.id, accountController.identity.address);

        if (deviceSharedSecret.isBackupDevice) {
            const tokens = await accountController.tokens.getTokens({
                "content.@type": "TokenContentDeviceSharedSecret",
                "content.sharedSecret.id": deviceSharedSecret.id.toString(),
                "content.sharedSecret.isBackupDevice": true
            });

            for (const token of tokens) {
                await accountController.tokens.delete(token);
            }
        }

        return [updatedLocalAccount, accountController];
    }

    public async createAccount(name: string): Promise<[LocalAccount, AccountController]> {
        const id = await CoreIdHelper.notPrefixed.generate();

        let localAccount = LocalAccount.from({
            id,
            directory: ".",
            name,
            order: -1
        });
        await this._localAccounts.create(localAccount);
        this._log.trace("Local account created.");

        this._log.trace(`Opening DB for account ${id}...`);
        const db = await this.databaseConnection.getDatabase(`acc-${id.toString()}`);
        this._log.trace(`DB for account ${id} opened.`);

        this._log.trace(`Initializing AccountController for local account ${id}...`);
        const accountController = new AccountController(this.transport, db, this.transport.config);
        await accountController.init();
        this._log.trace(`AccountController for local account ${id} initialized.`);

        this._openAccounts[id.toString()] = accountController;

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

    public async updateLocalAccountDeletionDate(address: string, deletionDate?: CoreDate): Promise<LocalAccount> {
        const oldAccount = await this._localAccounts.findOne({ address });

        if (!oldAccount) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, address).logWith(this._log);
        }

        const account = LocalAccount.from(oldAccount);

        account.deletionDate = deletionDate ?? undefined;
        await this._localAccounts.update(oldAccount, account);

        const cachedAccount = this.sessionStorage.findSession(address)?.account;
        if (cachedAccount) cachedAccount.deletionDate = deletionDate?.toString();

        return account;
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

    public async updatePushIdentifierForAccount(address: string, devicePushIdentifier: string): Promise<void> {
        const document = await this._localAccounts.findOne({ address });
        if (!document) {
            throw TransportCoreErrors.general.recordNotFound(LocalAccount, address).logWith(this._log);
        }

        const localAccount = LocalAccount.from(document);
        localAccount.devicePushIdentifier = devicePushIdentifier;

        await this._localAccounts.update(document, localAccount);
    }

    public async getAccountReferenceForDevicePushIdentifier(devicePushIdentifier: string): Promise<string> {
        const document = await this._localAccounts.findOne({ devicePushIdentifier });
        if (!document) throw new Error(`Could not resolve a local account reference for the device push identifier '${devicePushIdentifier}'.`);

        const localAccount = LocalAccount.from(document);
        return localAccount.id.toString();
    }
}
