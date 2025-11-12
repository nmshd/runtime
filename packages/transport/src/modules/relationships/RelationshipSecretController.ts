import { Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import {
    CoreBuffer,
    CryptoCipher,
    CryptoExchangeKeypair,
    CryptoRelationshipPublicRequest,
    CryptoRelationshipPublicResponse,
    CryptoRelationshipRequestSecrets,
    CryptoRelationshipSecrets,
    CryptoSecretKey,
    CryptoSignature,
    CryptoSignaturePublicKey
} from "@nmshd/crypto";
import { CoreUtil } from "../../core/CoreUtil.js";
import { ControllerName, CoreCrypto } from "../../core/index.js";
import { TransportCoreErrors } from "../../core/TransportCoreErrors.js";
import { TransportIds } from "../../core/TransportIds.js";
import { AccountController } from "../accounts/AccountController.js";
import { RelationshipTemplate } from "../relationshipTemplates/local/RelationshipTemplate.js";
import { RelationshipTemplatePublicKey } from "../relationshipTemplates/transmission/RelationshipTemplatePublicKey.js";
import { SecretContainerCipher } from "../secrets/data/SecretContainerCipher.js";
import { SecretController } from "../secrets/SecretController.js";

export class RelationshipSecretController extends SecretController {
    private readonly cache: Map<CoreId, CryptoRelationshipRequestSecrets | CryptoRelationshipSecrets> = new Map<
        CoreId,
        CryptoRelationshipRequestSecrets | CryptoRelationshipSecrets
    >();

    public constructor(parent: AccountController) {
        super(parent, ControllerName.RelationshipSecret);
    }

    @log()
    private async getSecret(relationshipSecretId: CoreId): Promise<CryptoRelationshipRequestSecrets | CryptoRelationshipSecrets> {
        const secretIdAsString = relationshipSecretId.toString();
        const cachedSecrets = this.cache.get(relationshipSecretId);
        if (cachedSecrets) {
            return cachedSecrets;
        }

        const secretContainer = await this.loadActiveSecretByName(secretIdAsString);
        if (!secretContainer) {
            throw TransportCoreErrors.general.recordNotFound("CryptoRelationshipRequestSecrets | CryptoRelationshipSecrets", secretIdAsString);
        }

        if (!(secretContainer.secret instanceof CryptoRelationshipRequestSecrets) && !(secretContainer.secret instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secretIdAsString);
        }
        const secret = secretContainer.secret;
        this.cache.set(relationshipSecretId, secret);
        return secret;
    }

    public async createRequestorSecrets(template: RelationshipTemplate, relationshipSecretId: CoreId): Promise<CryptoRelationshipPublicRequest> {
        const secrets = await CryptoRelationshipRequestSecrets.fromPeer(template.templateKey, template.identity.publicKey);
        await this.storeSecret(secrets, relationshipSecretId.toString(), "");

        const publicRequest = secrets.toPublicRequest();
        return publicRequest;
    }

    @log()
    public async createTemplatorSecrets(
        relationshipSecretId: CoreId,
        template: RelationshipTemplate,
        publicRequestCrypto: CryptoRelationshipPublicRequest
    ): Promise<SecretContainerCipher> {
        const templateKeyId = template.templateKey.id.toString();
        const exchangeKeypairContainer = await this.loadActiveSecretByName(templateKeyId);

        if (!exchangeKeypairContainer) {
            throw TransportCoreErrors.general.recordNotFound(CryptoExchangeKeypair, templateKeyId);
        }

        if (!(exchangeKeypairContainer.secret instanceof CryptoExchangeKeypair)) {
            throw TransportCoreErrors.secrets.wrongSecretType(templateKeyId);
        }

        const exchangeKeypair = exchangeKeypairContainer.secret;

        const secrets = await CryptoRelationshipSecrets.fromRelationshipRequest(publicRequestCrypto, exchangeKeypair);

        const secretContainer = await this.storeSecret(secrets, relationshipSecretId.toString());
        return secretContainer;
    }

    @log()
    public async getPublicCreationResponseContentCrypto(relationshipSecretId: CoreId): Promise<CryptoRelationshipPublicResponse> {
        const secret = await this.loadActiveSecretByName(relationshipSecretId.toString());
        if (!secret) {
            throw TransportCoreErrors.general.recordNotFound(CryptoRelationshipSecrets, relationshipSecretId.toString());
        }

        if (!(secret.secret instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secret.id.toString());
        }
        const publicResponse = secret.secret.toPublicResponse();
        return publicResponse;
    }

    @log()
    public async convertSecrets(relationshipSecretId: CoreId, response: CryptoRelationshipPublicResponse): Promise<SecretContainerCipher> {
        const request = await this.getSecret(relationshipSecretId);
        if (request instanceof CryptoRelationshipSecrets) {
            throw TransportCoreErrors.secrets.wrongSecretType();
        }

        const secrets = await CryptoRelationshipSecrets.fromRelationshipResponse(response, request);

        const container = await this.succeedSecretWithName(secrets, relationshipSecretId.toString());

        this.cache.set(relationshipSecretId, secrets);
        return container;
    }

    public async deleteSecretForRelationship(relationshipSecretId: CoreId): Promise<boolean> {
        const secret = await this.loadActiveSecretByName(relationshipSecretId.toString());
        if (!secret) {
            return false;
        }
        return await this.deleteSecretById(secret.id);
    }

    public async decryptTemplate(cipher: CryptoCipher, secretKey: CryptoSecretKey): Promise<CoreBuffer> {
        const decrypted = await CoreCrypto.decrypt(cipher, secretKey);
        return decrypted;
    }

    public async verifyTemplate(buffer: CoreBuffer, signature: CryptoSignature, templatorDeviceKey: CryptoSignaturePublicKey): Promise<boolean> {
        return await CoreCrypto.verify(buffer, signature, templatorDeviceKey);
    }

    @log()
    public async encryptCreationContent(relationshipSecretId: CoreId, content: Serializable | string | CoreBuffer): Promise<CryptoCipher> {
        const buffer = CoreUtil.toBuffer(content);
        const secrets = await this.getSecret(relationshipSecretId);

        if (!(secrets instanceof CryptoRelationshipRequestSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secrets.id);
        }

        return await secrets.encryptRequest(buffer);
    }

    @log()
    public async encrypt(relationshipSecretId: CoreId, content: Serializable | string): Promise<CryptoCipher> {
        const buffer = CoreUtil.toBuffer(content);
        const secrets = await this.getSecret(relationshipSecretId);

        if (!(secrets instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secrets.id);
        }

        return await secrets.encrypt(buffer);
    }

    @log()
    public async decryptCreationContent(relationshipSecretId: CoreId, cipher: CryptoCipher): Promise<CoreBuffer> {
        const secrets = await this.getSecret(relationshipSecretId);

        if (!(secrets instanceof CryptoRelationshipRequestSecrets) && !(secrets instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(relationshipSecretId.toString());
        }

        return await secrets.decryptRequest(cipher);
    }

    public async createTemplateKey(): Promise<RelationshipTemplatePublicKey> {
        const templateKeyId = await TransportIds.relationshipTemplateKey.generate();
        const key = await this.createExchangeKey(`${templateKeyId.toString()}`);
        const publicKey = key[0];
        return RelationshipTemplatePublicKey.from({
            id: templateKeyId,
            algorithm: publicKey.algorithm,
            publicKey: publicKey.publicKey
        });
    }

    @log()
    public async decryptPeer(relationshipSecretId: CoreId, cipher: CryptoCipher, omitCounterCheck = false): Promise<CoreBuffer> {
        const secrets = await this.getSecret(relationshipSecretId);

        if (!(secrets instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secrets.id);
        }

        return await secrets.decryptPeer(cipher, omitCounterCheck);
    }

    public async hasCryptoRelationshipSecrets(relationshipSecretId: CoreId): Promise<boolean> {
        const secrets = await this.getSecret(relationshipSecretId);
        return secrets instanceof CryptoRelationshipSecrets;
    }

    @log()
    public async decryptOwn(relationshipSecretId: CoreId, cipher: CryptoCipher): Promise<CoreBuffer> {
        const secrets = await this.getSecret(relationshipSecretId);

        if (!(secrets instanceof CryptoRelationshipSecrets)) {
            throw TransportCoreErrors.secrets.wrongSecretType(secrets.id);
        }

        return await secrets.decryptOwn(cipher);
    }

    public async sign(relationshipSecretId: CoreId, content: Serializable | string | CoreBuffer): Promise<CryptoSignature> {
        const bufferToSign = CoreUtil.toBuffer(content);
        const secrets = await this.getSecret(relationshipSecretId);
        return await secrets.sign(bufferToSign);
    }

    public async verifyOwn(relationshipSecretId: CoreId, content: Serializable | string | CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        const bufferToVerify = CoreUtil.toBuffer(content);
        const secrets = await this.getSecret(relationshipSecretId);
        return await secrets.verifyOwn(bufferToVerify, signature);
    }

    @log()
    public async verifyPeer(relationshipSecretId: CoreId, content: Serializable | string | CoreBuffer, signature: CryptoSignature): Promise<boolean> {
        const bufferToVerify = CoreUtil.toBuffer(content);

        const secrets = await this.getSecret(relationshipSecretId);
        if (secrets instanceof CryptoRelationshipRequestSecrets) {
            throw TransportCoreErrors.secrets.wrongSecretType(secrets.id);
        }

        const valid = await secrets.verifyPeer(bufferToVerify, signature);
        return valid;
    }
}
