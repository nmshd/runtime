import { log } from "@js-soft/ts-utils";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSecretKey, CryptoSignature, CryptoSignaturePrivateKey, CryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreCrypto, CredentialsBasic, TransportController, TransportCoreErrors, TransportError } from "../../core";
import { AccountController } from "../accounts/AccountController";
import { DeviceSecretController, DeviceSecretType } from "./DeviceSecretController";
import { Device, DeviceType } from "./local/Device";
import { DeviceSecretCredentials } from "./local/DeviceSecretCredentials";

export class DeviceController extends TransportController {
    public get secrets(): DeviceSecretController {
        return this._secrets;
    }
    private _secrets: DeviceSecretController;

    public get id(): CoreId {
        return this.device.id;
    }

    public get publicKey(): CryptoSignaturePublicKey | undefined {
        return this.device.publicKey;
    }

    public get name(): string | undefined {
        return this.device.name;
    }

    public get description(): string | undefined {
        return this.device.description;
    }

    public get operatingSystem(): string | undefined {
        return this.device.operatingSystem;
    }

    public get createdAt(): CoreDate {
        return this.device.createdAt;
    }

    public get type(): DeviceType {
        return this.device.type;
    }

    private _device?: Device;
    public get device(): Device {
        if (!this._device) throw new TransportError("The Device controller is not initialized.");
        return this._device;
    }
    public get deviceOrUndefined(): Device | undefined {
        return this._device;
    }

    public constructor(parent: AccountController) {
        super(ControllerName.Device, parent);
    }

    @log()
    public override async init(baseKey: CryptoSecretKey, device: Device): Promise<DeviceController> {
        await super.init();

        this._device = device;
        this._secrets = await new DeviceSecretController(this.parent, baseKey).init();

        return this;
    }

    public async changePassword(newPassword: string): Promise<void> {
        const oldPassword = (await this.getCredentials()).password;
        await this.parent.deviceAuthClient.changeDevicePassword({
            oldPassword: oldPassword,
            newPassword: newPassword
        });

        try {
            const credentialContainer = await this.secrets.loadSecret(DeviceSecretType.DeviceCredentials);
            if (!credentialContainer) {
                throw new TransportError("There was an error while accessing the device_credentials secret.");
            }
            const credentials = credentialContainer.secret as DeviceSecretCredentials;
            credentials.password = newPassword;

            await this.secrets.storeSecret(credentials, DeviceSecretType.DeviceCredentials);
        } catch (e) {
            this.log.warn(`We've changed the device password on the Backbone but weren't able to store it to the database. The new password is '${newPassword}'.`);
            throw e;
        }
    }

    public async update(update: { name?: string; description?: string; datawalletVersion?: number }): Promise<void> {
        if (update.name) this.device.name = update.name;
        if (update.description) this.device.description = update.description;
        if (update.datawalletVersion) this.device.datawalletVersion = update.datawalletVersion;

        await this.parent.devices.update(this.device);
        await this.parent.info.set("device", this.device.toJSON());
    }

    @log()
    public async sign(content: CoreBuffer): Promise<CryptoSignature> {
        const privateKeyContainer = await this.secrets.loadSecret(DeviceSecretType.DeviceSignature);
        if (!privateKeyContainer || !(privateKeyContainer.secret instanceof CryptoSignaturePrivateKey)) {
            throw TransportCoreErrors.secrets.secretNotFound(DeviceSecretType.DeviceSignature);
        }
        const privateKey = privateKeyContainer.secret;
        const signature = await CoreCrypto.sign(content, privateKey);
        privateKey.privateKey.clear();

        return signature;
    }

    @log()
    public async verify(content: CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        if (!this.publicKey) {
            throw new TransportError("The device has no public key to verify a signature. This can happen if the device is not onboarded yet.");
        }

        return await CoreCrypto.verify(content, signature, this.publicKey);
    }

    @log()
    public async getCredentials(): Promise<CredentialsBasic> {
        const credentialContainer = await this.secrets.loadSecret(DeviceSecretType.DeviceCredentials);

        if (!credentialContainer) {
            throw TransportCoreErrors.secrets.secretNotFound(DeviceSecretType.DeviceCredentials);
        }

        if (!(credentialContainer.secret instanceof DeviceSecretCredentials)) {
            throw TransportCoreErrors.secrets.wrongSecretType(DeviceSecretType.DeviceCredentials);
        }

        const credentials = credentialContainer.secret;
        if (!credentials.username || !credentials.password) {
            throw TransportCoreErrors.secrets.wrongSecretType(DeviceSecretType.DeviceCredentials);
        }

        return {
            username: credentials.username,
            password: credentials.password
        };
    }

    public async setCommunicationLanguage(language: string): Promise<void> {
        const result = await this.parent.deviceAuthClient.updateCurrentDevice({ communicationLanguage: language });
        if (result.isError) {
            throw result.error;
        }
    }

    public async markAsOffboarded(): Promise<void> {
        this.device.isOffboarded = true;
        await this.parent.devices.update(this.device);

        await this.parent.syncDatawallet();
    }
}
