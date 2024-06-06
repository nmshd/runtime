import { IDatabaseCollection, IDatabaseCollectionProvider, IDatabaseMap } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { log } from "@js-soft/ts-utils";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AbstractAuthenticator, Authenticator, ControllerName, CoreAddress, CoreDate, CoreErrors, CoreId, IConfig, Transport, TransportError } from "../../core";
import { CoreCrypto } from "../../core/CoreCrypto";
import { DbCollectionName } from "../../core/DbCollectionName";
import { DependencyOverrides } from "../../core/DependencyOverrides";
import { TransportLoggerFactory } from "../../core/TransportLoggerFactory";
import { PasswordGenerator } from "../../util";
import { CertificateController } from "../certificates/CertificateController";
import { CertificateIssuer } from "../certificates/CertificateIssuer";
import { CertificateValidator } from "../certificates/CertificateValidator";
import { ChallengeController } from "../challenges/ChallengeController";
import { BackbonePutDevicesPushNotificationRequest, DeviceAuthClient } from "../devices/backbone/DeviceAuthClient";
import { DeviceClient } from "../devices/backbone/DeviceClient";
import { DeviceController } from "../devices/DeviceController";
import { DevicesController } from "../devices/DevicesController";
import { DeviceSecretType } from "../devices/DeviceSecretController";
import { Device, DeviceInfo, DeviceType } from "../devices/local/Device";
import { DeviceSecretCredentials } from "../devices/local/DeviceSecretCredentials";
import { DeviceSharedSecret } from "../devices/transmission/DeviceSharedSecret";
import { FileController } from "../files/FileController";
import { MessageController } from "../messages/MessageController";
import { RelationshipsController } from "../relationships/RelationshipsController";
import { RelationshipSecretController } from "../relationships/RelationshipSecretController";
import { RelationshipTemplateController } from "../relationshipTemplates/RelationshipTemplateController";
import { SecretController } from "../secrets/SecretController";
import { ChangedItems } from "../sync/ChangedItems";
import { SyncProgressCallback, SyncProgressReporter } from "../sync/SyncCallback";
import { SyncController } from "../sync/SyncController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { TokenController } from "../tokens/TokenController";
import { IdentityClient } from "./backbone/IdentityClient";
import { Identity } from "./data/Identity";
import { IdentityController } from "./IdentityController";
import { IdentityDeletionProcessController } from "./IdentityDeletionProcessController";
import { IdentityUtil } from "./IdentityUtil";

export class AccountController {
    private readonly _authenticator: AbstractAuthenticator;
    private unpushedDatawalletModifications: IDatabaseCollection;

    public get authenticator(): AbstractAuthenticator {
        return this._authenticator;
    }

    public deviceClient: DeviceClient;
    public deviceAuthClient: DeviceAuthClient;
    public identityClient: IdentityClient;

    public info: IDatabaseMap;

    public challenges: ChallengeController;
    public certificates: CertificateController;
    public certificateIssuer: CertificateIssuer;
    public certificateValidator: CertificateValidator;
    public devices: DevicesController;
    public files: FileController;
    public messages: MessageController;
    public relationships: RelationshipsController;
    public relationshipTemplates: RelationshipTemplateController;
    private synchronization: SyncController;
    public tokens: TokenController;

    private relationshipSecrets: RelationshipSecretController;
    private readonly _log: ILogger;
    public get log(): ILogger {
        return this._log;
    }

    public get config(): IConfig {
        return this._config;
    }

    public get db(): IDatabaseCollectionProvider {
        return this._db;
    }

    protected _dbClosed = false;

    public get transport(): Transport {
        return this._transport;
    }

    protected _activeDevice?: DeviceController;
    public get activeDevice(): DeviceController {
        if (!this._activeDevice) {
            throw new TransportError("The DeviceController is not initialized yet.");
        }
        return this._activeDevice;
    }
    public get activeDeviceOrUndefined(): DeviceController | undefined {
        return this._activeDevice;
    }

    protected _identity: IdentityController;
    public get identity(): IdentityController {
        return this._identity;
    }

    protected _identityDeletionProcess: IdentityDeletionProcessController;
    public get identityDeletionProcess(): IdentityDeletionProcessController {
        return this._identityDeletionProcess;
    }

    public constructor(
        private readonly _transport: Transport,
        private readonly _db: IDatabaseCollectionProvider,
        private readonly _config: IConfig,
        private readonly dependencyOverrides: DependencyOverrides = {}
    ) {
        this._authenticator = new Authenticator(this);
        this._log = TransportLoggerFactory.getLogger(ControllerName.Account);
    }

    @log()
    public async init(deviceSharedSecret?: DeviceSharedSecret): Promise<AccountController> {
        this.info = await this.db.getMap("AccountInfo");
        this.unpushedDatawalletModifications = await this.db.getCollection(DbCollectionName.UnpushedDatawalletModifications);

        this.deviceClient = new DeviceClient(this.config);
        this.identityClient = new IdentityClient(this.config);

        this._identity = new IdentityController(this);
        this._identityDeletionProcess = new IdentityDeletionProcessController(this);
        this._activeDevice = new DeviceController(this);
        this.challenges = await new ChallengeController(this).init();

        const [availableIdentityDoc, availableDeviceDoc, availableBaseKeyDoc] = await Promise.all([this.info.get("identity"), this.info.get("device"), this.info.get("baseKey")]);

        let device: Device;
        let identityCreated = false;
        let deviceUpdated = false;

        if (!availableIdentityDoc && !availableDeviceDoc) {
            if (!deviceSharedSecret) {
                if (!this.config.allowIdentityCreation) {
                    throw new TransportError("No Identity found and identity creation is not allowed.");
                }

                // Identity creation
                this._log.trace("No account information found. Creating new account...");
                const result = await this.createIdentityAndDevice();

                identityCreated = true;
                device = result.device;
                this.deviceAuthClient = new DeviceAuthClient(this.config, this.authenticator);
            } else {
                // Device Onboarding
                device = await this.onboardDevice(deviceSharedSecret);
                deviceUpdated = true;
            }
        } else if (!deviceSharedSecret && availableIdentityDoc && availableDeviceDoc) {
            // Login
            if (!availableBaseKeyDoc) {
                throw CoreErrors.secrets.secretNotFound("BaseKey");
            }

            const availableIdentity = Identity.from(availableIdentityDoc);
            const availableDevice = Device.from(availableDeviceDoc);
            const availableBaseKey = CryptoSecretKey.fromJSON(availableBaseKeyDoc);

            await this.identity.init(availableIdentity);
            await this.identityDeletionProcess.init();
            await this.activeDevice.init(availableBaseKey, availableDevice);

            this.deviceAuthClient = new DeviceAuthClient(this.config, this.authenticator);
        } else {
            throw new TransportError("The combination of deviceSharedSecret, existing identity or device is not allowed.");
        }

        this._log.trace(`Using device ${this.activeDevice.id} for identity ${this.identity.address}.`);

        await this.initControllers();

        if (identityCreated) {
            await this.devices.addExistingDevice(device!);
            await this.synchronization.setInititalDatawalletVersion(this._config.supportedDatawalletVersion);
        } else if (deviceUpdated) {
            await this.syncDatawallet();
            await this.devices.update(device!);
        }
        await this.syncDatawallet();

        return this;
    }

    public async close(): Promise<void> {
        if (!this._dbClosed) {
            this._log.trace(`Closing DB for account ${this.identity.identity.address.toString()}.`);
            await this._db.close();
            this._dbClosed = true;
        }
    }

    private async initControllers() {
        this._log.trace("Initializing controllers...");

        this.relationshipSecrets = await new RelationshipSecretController(this).init();
        this.devices = await new DevicesController(this).init();
        this.certificates = await new CertificateController(this).init();
        this.certificateIssuer = await new CertificateIssuer(this).init();
        this.certificateValidator = await new CertificateValidator(this).init();
        this.files = await new FileController(this).init();

        this.relationships = await new RelationshipsController(this, this.relationshipSecrets).init();

        this.relationshipTemplates = await new RelationshipTemplateController(this, this.relationshipSecrets).init();
        this.messages = await new MessageController(this).init();
        this.tokens = await new TokenController(this).init();

        this.synchronization = await new SyncController(this, this.dependencyOverrides, this.unpushedDatawalletModifications, this.config.datawalletEnabled).init();

        this._log.trace("Initialization of controllers finished.");
    }

    private autoSync = true;
    public disableAutoSync(): void {
        this.autoSync = false;
    }

    public async enableAutoSync(): Promise<void> {
        this.autoSync = true;
        await this.syncDatawallet();
    }

    public async syncDatawallet(force = false, syncProgressCallback?: SyncProgressCallback): Promise<void> {
        if (!force && !this.autoSync) {
            return;
        }

        const reporter = SyncProgressReporter.fromCallback(syncProgressCallback);
        return await this.synchronization.sync("OnlyDatawallet", reporter);
    }

    public async syncEverything(syncProgressCallback?: SyncProgressCallback): Promise<ChangedItems> {
        const reporter = SyncProgressReporter.fromCallback(syncProgressCallback);
        return await this.synchronization.sync("Everything", reporter);
    }

    public async getLastCompletedSyncTime(): Promise<CoreDate | undefined> {
        return await this.synchronization.getLastCompletedSyncTime();
    }

    public async getLastCompletedDatawalletSyncTime(): Promise<CoreDate | undefined> {
        return await this.synchronization.getLastCompletedDatawalletSyncTime();
    }

    @log()
    private async createIdentityAndDevice(): Promise<{ identity: Identity; device: Device }> {
        const [identityKeypair, devicePwdD1, deviceKeypair, privBaseShared, privBaseDevice] = await Promise.all([
            // Generate identity keypair
            CoreCrypto.generateSignatureKeypair(),
            // Generate strong device password
            PasswordGenerator.createStrongPassword(45, 50),
            // Generate device keypair
            CoreCrypto.generateSignatureKeypair(),
            // Generate Shared Base Key
            CoreCrypto.generateSecretKey(),
            // Generate Device Base Key
            CoreCrypto.generateSecretKey()
        ]);
        this._log.trace("Created keys. Requesting challenge...");

        // Sign Challenge
        const signedChallenge = await this.challenges.createAccountCreationChallenge(identityKeypair);
        this._log.trace("Challenge signed. Creating device...");

        const [deviceResponseResult, privSync, localAddress, deviceInfo] = await Promise.all([
            // Register first device (and identity) on backbone
            this.identityClient.createIdentity({
                devicePassword: devicePwdD1,
                identityPublicKey: identityKeypair.publicKey.toBase64(),
                signedChallenge: signedChallenge.toJSON(false),
                clientId: this._config.platformClientId,
                clientSecret: this._config.platformClientSecret,
                identityVersion: this._config.supportedIdentityVersion
            }),
            // Generate Synchronization Root Key
            CoreCrypto.generateSecretKey(),

            // Generate address locally
            IdentityUtil.createAddress(identityKeypair.publicKey, new URL(this._config.baseUrl).hostname),
            this.fetchDeviceInfo()
        ]);

        if (deviceResponseResult.isError) {
            const error = deviceResponseResult.error;
            if (error.code === "error.platform.unauthorized") {
                throw CoreErrors.general.platformClientInvalid();
            }
        }

        const deviceResponse = deviceResponseResult.value;

        this._log.trace(`Registered identity with address ${deviceResponse.address}, device id is ${deviceResponse.device.id}.`);

        if (!localAddress.equals(deviceResponse.address)) {
            throw new TransportError("The backbone address does not match the local address.");
        }

        const identity = Identity.from({
            address: CoreAddress.from(deviceResponse.address),
            publicKey: identityKeypair.publicKey
        });

        const deviceId = CoreId.from(deviceResponse.device.id);

        const device = Device.from({
            createdAt: CoreDate.from(deviceResponse.createdAt),
            createdByDevice: deviceId,
            id: deviceId,
            name: "Device 1",
            lastLoginAt: CoreDate.utc(),
            operatingSystem: deviceInfo.operatingSystem,
            publicKey: deviceKeypair.publicKey,
            type: deviceInfo.type,
            certificate: "",
            username: deviceResponse.device.username,
            datawalletVersion: this._config.supportedDatawalletVersion
        });

        // Initialize required controllers
        await this.identity.init(identity);
        await this.identityDeletionProcess.init();
        await this.activeDevice.init(privBaseDevice, device);

        const deviceCredentials = DeviceSecretCredentials.from({
            id: device.id,
            username: deviceResponse.device.username,
            password: devicePwdD1
        });

        await Promise.all([
            this.info.set("device", device.toJSON()),
            this.info.set("identity", identity.toJSON()),
            this.info.set("baseKey", privBaseDevice.toJSON()),
            this.activeDevice.secrets.storeSecret(privBaseShared, DeviceSecretType.SharedSecretBaseKey),
            this.activeDevice.secrets.storeSecret(privSync, DeviceSecretType.IdentitySynchronizationMaster),
            this.activeDevice.secrets.storeSecret(identityKeypair.privateKey, DeviceSecretType.IdentitySignature),
            this.activeDevice.secrets.storeSecret(deviceKeypair.privateKey, DeviceSecretType.DeviceSignature),
            this.activeDevice.secrets.storeSecret(deviceCredentials, DeviceSecretType.DeviceCredentials)
        ]);

        return { identity, device };
    }

    public async onboardDevice(deviceSharedSecret: DeviceSharedSecret): Promise<Device> {
        this._log.trace("Onboarding device for existing identity...");
        const [devicePwdDn, deviceKeypair, deviceInfo, privBaseDevice] = await Promise.all([
            // Generate strong device password
            PasswordGenerator.createStrongPassword(45, 50),
            // Generate device keypair
            CoreCrypto.generateSignatureKeypair(),
            this.fetchDeviceInfo(),
            // Generate device basekey
            CoreCrypto.generateSecretKey()
        ]);

        const device = Device.from({
            id: deviceSharedSecret.id,
            name: deviceSharedSecret.name ? deviceSharedSecret.name : "",
            description: deviceSharedSecret.description,
            lastLoginAt: CoreDate.utc(),
            createdAt: deviceSharedSecret.createdAt,
            createdByDevice: deviceSharedSecret.createdByDevice,
            operatingSystem: deviceInfo.operatingSystem,
            type: deviceInfo.type,
            publicKey: deviceKeypair.publicKey,
            username: deviceSharedSecret.username,
            initialPassword: undefined,
            isAdmin: deviceSharedSecret.identityPrivateKey ? true : false
        });

        // Initialize required controllers
        await this.identity.init(deviceSharedSecret.identity);
        await this.identityDeletionProcess.init();
        await this.activeDevice.init(privBaseDevice, device);

        const deviceCredentials = DeviceSecretCredentials.from({
            id: deviceSharedSecret.id,
            username: deviceSharedSecret.username,
            password: deviceSharedSecret.password
        });

        await Promise.all([
            this.info.set("device", device.toJSON()),
            this.info.set("identity", deviceSharedSecret.identity.toJSON()),
            this.info.set("baseKey", privBaseDevice.toJSON()),
            this.info.set(SecretController.secretNonceKey, deviceSharedSecret.deviceIndex * 1000000),
            this.activeDevice.secrets.storeSecret(deviceSharedSecret.secretBaseKey, DeviceSecretType.SharedSecretBaseKey),
            this.activeDevice.secrets.storeSecret(deviceSharedSecret.synchronizationKey, DeviceSecretType.IdentitySynchronizationMaster),
            this.activeDevice.secrets.storeSecret(deviceKeypair.privateKey, DeviceSecretType.DeviceSignature),
            this.activeDevice.secrets.storeSecret(deviceCredentials, DeviceSecretType.DeviceCredentials)
        ]);

        if (deviceSharedSecret.identityPrivateKey) {
            await this.activeDevice.secrets.storeSecret(deviceSharedSecret.identityPrivateKey, DeviceSecretType.IdentitySignature);
        }

        this.deviceAuthClient = new DeviceAuthClient(this.config, this.authenticator);

        await this.activeDevice.changePassword(devicePwdDn);

        return device;
    }

    public async registerPushNotificationToken(token: BackbonePutDevicesPushNotificationRequest): Promise<{ devicePushIdentifier: string }> {
        const result = await this.deviceAuthClient.registerPushNotificationToken(token);
        return result.value;
    }

    public async unregisterPushNotificationToken(): Promise<void> {
        await this.deviceAuthClient.unregisterPushNotificationToken();
    }

    public fetchDeviceInfo(): Promise<DeviceInfo> {
        return Promise.resolve({
            operatingSystem: "",
            type: DeviceType.Unknown
        });
    }

    public async getSynchronizedCollection(collectionName: string): Promise<SynchronizedCollection> {
        const collection = await this.db.getCollection(collectionName);
        if (!this.config.datawalletEnabled) {
            return new SynchronizedCollection(collection, this.config.supportedDatawalletVersion);
        }

        return new SynchronizedCollection(collection, this.config.supportedDatawalletVersion, this.unpushedDatawalletModifications);
    }
}
