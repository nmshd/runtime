import { Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreDate, CoreId } from "@nmshd/core-types";
import {
    CoreBuffer,
    CryptoExchangeKeypair,
    CryptoExchangePrivateKey,
    CryptoExchangePublicKey,
    CryptoRelationshipRequestSecrets,
    CryptoRelationshipSecrets,
    CryptoSecretKey,
    CryptoSignatureKeypair,
    CryptoSignaturePrivateKey
} from "@nmshd/crypto";
import { DbCollectionName } from "../../core/DbCollectionName.js";
import { CoreCrypto, TransportCoreErrors, TransportIds } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { AccountController } from "../accounts/AccountController.js";
import { DeviceSecretType } from "../devices/DeviceSecretController.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { SecretContainerCipher } from "./data/SecretContainerCipher.js";
import { SecretContainerPlain } from "./data/SecretContainerPlain.js";

export enum SecretBaseKeyType {
    Random = "random",
    Password = "password",
    External = "external"
}

/**
 * The SecretController which acts as a single touchpoint to access any secret within the Runtime.
 * Each access can be audited.
 */
export class SecretController extends TransportController {
    /**
     * Context of the secret derivation function. Doesn't have to be secret.
     * Must be 8 characters long.
     */
    private static readonly secretContext: string = "SECRET01";

    public static readonly secretNonceKey: string = "secret_lastnonce";

    private nonce = 0;

    private baseKey?: CryptoSecretKey;

    private secrets: SynchronizedCollection;

    public constructor(parent: AccountController, name: ControllerName = ControllerName.Secret) {
        super(name, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.secrets = await this.parent.getSynchronizedCollection(DbCollectionName.Secrets);
        const lastNonce = await this.parent.info.get(SecretController.secretNonceKey);
        if (lastNonce) {
            this.nonce = lastNonce;
        }
        return this;
    }

    public async storeSecret(
        secret:
            | CryptoRelationshipRequestSecrets
            | CryptoRelationshipSecrets
            | CryptoExchangeKeypair
            | CryptoExchangePrivateKey
            | CryptoSignatureKeypair
            | CryptoSignaturePrivateKey
            | CryptoSecretKey,
        name: string,
        description = "",
        validTo?: CoreDate
    ): Promise<SecretContainerCipher> {
        const plainString = secret.serialize();
        const plainBuffer = CoreBuffer.fromUtf8(plainString);

        const nonce = await this.increaseNonce();
        const encryptionKey = await CoreCrypto.deriveKeyFromBase(await this.getBaseKey(), nonce, SecretController.secretContext);

        const cipher = await CoreCrypto.encrypt(plainBuffer, encryptionKey);
        const createdAt = CoreDate.utc();
        const container = SecretContainerCipher.from({
            cipher: cipher,
            createdAt: createdAt,
            name: name,
            description: description,
            id: await TransportIds.secret.generate(),
            nonce: nonce,
            validFrom: createdAt,
            validTo: validTo,
            active: true
        });

        this.log.trace(`Created secret id:${container.id} name:${container.name} on ${container.createdAt.toISOString()}.`);

        await this.secrets.create(container);

        return container;
    }

    public async loadSecretsByName(name: string): Promise<SecretContainerPlain[]> {
        const secrets = await this.secrets.find({ name: name });
        const plainSecrets: SecretContainerPlain[] = [];
        for (const secretObj of secrets) {
            const secret = SecretContainerCipher.from(secretObj);
            const plainSecret = await this.loadSecretById(secret.id);
            if (plainSecret) {
                plainSecrets.push(plainSecret);
            }
        }
        return plainSecrets;
    }

    public async loadActiveSecretByName(name: string): Promise<SecretContainerPlain | undefined> {
        const secret = await this.getActiveSecretContainerByName(name);
        if (!secret) return;

        const plainSecret = await this.loadSecretById(secret.id);

        return plainSecret;
    }

    private async getActiveSecretContainerByName(name: string): Promise<SecretContainerCipher | undefined> {
        const secrets = await this.secrets.find({ name: name, active: true });
        if (!secrets.length) return;

        if (secrets.length > 1) {
            this.log.warn(`More than one active secret has been found for secret name '${name}'.`);
        }

        const secret = SecretContainerCipher.from(secrets[0]);
        return secret;
    }

    public async succeedSecretWithName(
        secret:
            | CryptoRelationshipRequestSecrets
            | CryptoRelationshipSecrets
            | CryptoExchangeKeypair
            | CryptoExchangePrivateKey
            | CryptoSignatureKeypair
            | CryptoSignaturePrivateKey
            | CryptoSecretKey,
        name: string,
        description = "",
        validTo?: CoreDate
    ): Promise<SecretContainerCipher> {
        const oldSecret = await this.secrets.findOne({ name: name, active: true });
        if (oldSecret) {
            const updatedOldSecret = SecretContainerCipher.from(oldSecret);
            updatedOldSecret.validTo = CoreDate.utc();
            updatedOldSecret.active = false;
            await this.secrets.update(oldSecret, updatedOldSecret);
        }
        return await this.storeSecret(secret, name, description, validTo);
    }

    private async decryptSecret(secret: SecretContainerCipher): Promise<SecretContainerPlain> {
        const baseKey = await this.getBaseKey();
        const decryptionKey = await CoreCrypto.deriveKeyFromBase(baseKey, secret.nonce ?? 0, SecretController.secretContext);
        const plainBuffer = await CoreCrypto.decrypt(secret.cipher, decryptionKey);
        const plainString = plainBuffer.toUtf8();
        const decryptedSecret = Serializable.deserializeUnknown(plainString);

        const plainSecret = SecretContainerPlain.from({
            id: secret.id,
            createdAt: secret.createdAt,
            description: secret.description,
            nonce: secret.nonce,
            name: secret.name,
            secret: decryptedSecret,
            active: secret.active,
            validFrom: secret.validFrom,
            validTo: secret.validTo
        });

        this.log.trace(`Accessed secret id:${plainSecret.id} name:${plainSecret.name} on ${CoreDate.utc().toISOString()}.`);
        return plainSecret;
    }

    public async loadSecretById(id: CoreId): Promise<SecretContainerPlain | undefined> {
        const secretObj = await this.secrets.findOne({ id: id.toString() });
        if (!secretObj) return;
        const secret = SecretContainerCipher.from(secretObj);

        return await this.decryptSecret(secret);
    }

    public async deleteSecretById(id: CoreId): Promise<boolean> {
        const secretObj = await this.secrets.findOne({ id: id.toString() });
        if (!secretObj) {
            return false;
        }

        await this.secrets.delete({ id: id });
        this.log.trace(`Deleted secret id:${secretObj.id} name:${secretObj.name} on ${CoreDate.utc().toISOString()}.`);
        return true;
    }

    public async createExchangeKey(name = "", description = "", validTo?: CoreDate): Promise<[CryptoExchangePublicKey, SecretContainerCipher]> {
        const exchangeKeypair = await CoreCrypto.generateExchangeKeypair();
        const secretContainer = await this.storeSecret(exchangeKeypair, name, description, validTo);
        return [exchangeKeypair.publicKey, secretContainer];
    }

    @log()
    private async getBaseKey(): Promise<CryptoSecretKey> {
        if (this.baseKey) {
            return this.baseKey;
        }

        const baseKey = await this.parent.activeDevice.secrets.loadSecret(DeviceSecretType.SharedSecretBaseKey);

        if (baseKey) {
            this.baseKey = baseKey.secret as CryptoSecretKey;
        } else {
            throw TransportCoreErrors.general.recordNotFound(CryptoSecretKey, DeviceSecretType.SharedSecretBaseKey);
        }

        return this.baseKey;
    }

    private async increaseNonce(): Promise<number> {
        const nextNonce = this.nonce++;
        await this.parent.info.set(SecretController.secretNonceKey, nextNonce);
        return nextNonce;
    }
}
