import { IDatabaseMap } from "@js-soft/docdb-access-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoExchangeKeypair, CryptoExchangePrivateKey, CryptoSecretKey, CryptoSignatureKeypair, CryptoSignaturePrivateKey } from "@nmshd/crypto";
import { CoreCrypto, TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { TransportIds } from "../../core/TransportIds.js";
import { AccountController } from "../accounts/AccountController.js";
import { SecretContainerCipher } from "../secrets/data/SecretContainerCipher.js";
import { SecretContainerPlain } from "../secrets/data/SecretContainerPlain.js";
import { DatawalletModification } from "../sync/local/DatawalletModification.js";
import { Device } from "./local/Device.js";
import { DeviceSecretCredentials } from "./local/DeviceSecretCredentials.js";
import { DeviceSharedSecret } from "./transmission/DeviceSharedSecret.js";

export enum DeviceSecretType {
    IdentitySynchronizationMaster = "identity_synchronization_master",
    IdentitySignature = "identity_signature",
    SharedSecretBaseKey = "shared_basekey",
    DeviceSecretBaseKey = "secret_basekey",
    DeviceSignature = "device_signature",
    DeviceCredentials = "device_credentials"
}

/**
 * The SecretController which acts as a single touchpoint to access any secret within the Runtime.
 * Each access can be audited.
 *
 */
export class DeviceSecretController extends TransportController {
    private secrets: IDatabaseMap;

    private static readonly secretContext: string = "DEVICE01";

    private readonly baseKey?: CryptoSecretKey;

    public constructor(parent: AccountController, baseKey: CryptoSecretKey) {
        super(ControllerName.DeviceSecret, parent);
        this.baseKey = baseKey;
    }

    public override async init(): Promise<DeviceSecretController> {
        await super.init();

        this.secrets = await this.db.getMap("DeviceSecrets");

        return this;
    }

    public async storeSecret(
        secret: DeviceSecretCredentials | CryptoExchangeKeypair | CryptoExchangePrivateKey | CryptoSignatureKeypair | CryptoSignaturePrivateKey | CryptoSecretKey,
        name: string
    ): Promise<SecretContainerCipher> {
        const plainString = secret.serialize();
        const plainBuffer = CoreBuffer.fromUtf8(plainString);

        const encryptionKey = await CoreCrypto.deriveKeyFromBase(this.getBaseKey(), 1, DeviceSecretController.secretContext);

        const cipher = await CoreCrypto.encrypt(plainBuffer, encryptionKey);
        const date = CoreDate.utc();
        const container = SecretContainerCipher.from({
            cipher: cipher,
            createdAt: date,
            name: name,
            id: await TransportIds.secret.generate(),
            validFrom: date,
            active: true
        });

        this.log.trace(`Created device secret id:${container.id} name:${container.name} on ${container.createdAt.toISOString()}.`);

        await this.secrets.set(name, container.toJSON());

        return container;
    }

    public async loadSecret(name: string): Promise<SecretContainerPlain | undefined> {
        const secretObj = await this.secrets.get(name);
        if (!secretObj) return;

        const baseKey = this.getBaseKey();
        const secret = SecretContainerCipher.from(secretObj);
        const decryptionKey = await CoreCrypto.deriveKeyFromBase(baseKey, 1, DeviceSecretController.secretContext);
        const plainBuffer = await CoreCrypto.decrypt(secret.cipher, decryptionKey);
        const plainString = plainBuffer.toUtf8();

        const decryptedSecret = Serializable.deserializeUnknown(plainString);

        const plainSecret = SecretContainerPlain.from({
            id: secret.id,
            createdAt: secret.createdAt,
            name: secret.name,
            secret: decryptedSecret,
            validFrom: secret.validFrom,
            validTo: secret.validTo,
            active: secret.active
        });
        this.log.trace(`Accessed device secret id:${plainSecret.id} name:${plainSecret.name} on ${CoreDate.utc().toISOString()}.`);
        return plainSecret;
    }

    public async deleteSecret(name: string): Promise<boolean> {
        const secretObj = await this.secrets.get(name);
        if (!secretObj) return false;

        await this.secrets.delete(name);
        this.log.trace(`Deleted device secret id:${secretObj.id} name:${secretObj.name} on ${CoreDate.utc().toISOString()}.`);
        return true;
    }

    @log()
    public async createDeviceSharedSecret(device: Device, deviceIndex: number, includeIdentityPrivateKey = false, profileName?: string): Promise<DeviceSharedSecret> {
        const synchronizationKey = await this.loadSecret(DeviceSecretType.IdentitySynchronizationMaster);
        if (!synchronizationKey || !(synchronizationKey.secret instanceof CryptoSecretKey)) {
            throw TransportCoreErrors.secrets.secretNotFound("SynchronizationKey");
        }

        const baseKey = await this.loadSecret(DeviceSecretType.SharedSecretBaseKey);
        if (!baseKey || !(baseKey.secret instanceof CryptoSecretKey)) {
            throw TransportCoreErrors.secrets.secretNotFound("baseKey");
        }

        let identityPrivateKey;
        if (includeIdentityPrivateKey) {
            identityPrivateKey = await this.loadSecret(DeviceSecretType.IdentitySignature);
            if (!identityPrivateKey || !(identityPrivateKey.secret instanceof CryptoSignaturePrivateKey)) {
                throw TransportCoreErrors.secrets.secretNotFound("IdentityKey");
            }
        }

        const deviceSharedSecret = DeviceSharedSecret.from({
            id: device.id,
            createdAt: device.createdAt,
            createdByDevice: device.createdByDevice,
            deviceIndex: deviceIndex,
            secretBaseKey: baseKey.secret,
            name: device.name,
            description: device.description,
            profileName,
            synchronizationKey: synchronizationKey.secret,
            identityPrivateKey: identityPrivateKey?.secret as CryptoSignaturePrivateKey,
            username: device.username,
            password: device.initialPassword!,
            identity: this.parent.identity.identity,
            isBackupDevice: device.isBackupDevice
        });

        return deviceSharedSecret;
    }

    @log()
    public async encryptDatawalletModificationPayload(event: DatawalletModification, index: number): Promise<string | undefined> {
        if (!event.payload) {
            return undefined;
        }

        const serializedEvent = CoreBuffer.fromUtf8(JSON.stringify(event.payload));
        const privSync = await this.loadSecret(DeviceSecretType.IdentitySynchronizationMaster);
        if (!privSync || !(privSync.secret instanceof CryptoSecretKey)) {
            throw TransportCoreErrors.secrets.secretNotFound(DeviceSecretType.IdentitySynchronizationMaster);
        }

        const encryptionKey = await CoreCrypto.deriveKeyFromBase(privSync.secret, index, "DataSync");

        const cipher = await CoreCrypto.encrypt(serializedEvent, encryptionKey);
        privSync.secret.clear();
        return cipher.toBase64();
    }

    @log()
    public async decryptDatawalletModificationPayload(payloadCipherBase64: string | null, index: number): Promise<object | undefined> {
        if (!payloadCipherBase64) {
            return undefined;
        }

        const payloadCipher = CryptoCipher.fromBase64(payloadCipherBase64);

        const privSync = await this.loadSecret(DeviceSecretType.IdentitySynchronizationMaster);
        if (!privSync || !(privSync.secret instanceof CryptoSecretKey)) {
            throw TransportCoreErrors.secrets.secretNotFound(DeviceSecretType.IdentitySynchronizationMaster);
        }

        const decryptionKey = await CoreCrypto.deriveKeyFromBase(privSync.secret, index, "DataSync");

        const plaintext = await CoreCrypto.decrypt(payloadCipher, decryptionKey);
        privSync.secret.clear();

        const deserializedObject = JSON.parse(plaintext.toUtf8());

        return deserializedObject;
    }

    @log()
    private getBaseKey(): CryptoSecretKey {
        if (!this.baseKey) {
            throw TransportCoreErrors.general.recordNotFound(CryptoSecretKey, DeviceSecretType.SharedSecretBaseKey);
        }

        return this.baseKey;
    }
}
