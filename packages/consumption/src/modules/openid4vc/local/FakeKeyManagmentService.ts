/* eslint-disable @typescript-eslint/no-unused-vars */
import { AgentContext } from "@credo-ts/core";
import {
    KeyManagementService,
    KmsCreateKeyOptions,
    KmsCreateKeyReturn,
    KmsCreateKeyType,
    KmsDecryptOptions,
    KmsDecryptReturn,
    KmsDeleteKeyOptions,
    KmsEncryptOptions,
    KmsEncryptReturn,
    KmsImportKeyOptions,
    KmsImportKeyReturn,
    KmsJwkPrivate,
    KmsJwkPublic,
    KmsOperation,
    KmsRandomBytesOptions,
    KmsRandomBytesReturn,
    KmsSignOptions,
    KmsSignReturn,
    KmsVerifyOptions,
    KmsVerifyReturn
} from "@credo-ts/core/build/modules/kms";

export interface JwkKeyPair {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
}

export class FakeKeyManagmentService implements KeyManagementService {
    public static readonly backend = "fakeKeyManagementService";
    public readonly backend = FakeKeyManagmentService.backend;

    public keystore: Map<string, string>;
    public constructor() {
        this.keystore = new Map<string, string>();
    }

    public isOperationSupported(agentContext: AgentContext, operation: KmsOperation): boolean {
        if (operation.operation === "createKey") {
            return true;
        }
        if (operation.operation === "verify") {
            return true;
        }
        if (operation.operation === "sign" && operation.algorithm === "ES256") {
            return true;
        }
        return false;
    }
    public getPublicKey(agentContext: AgentContext, keyId: string): Promise<KmsJwkPublic> {
        const keyPair = this.keystore.get(keyId);
        if (!keyPair) {
            throw new Error(`Key with id ${keyId} not found`);
        }

        return Promise.resolve((JSON.parse(keyPair) as JwkKeyPair).publicKey as KmsJwkPublic);
    }
    public async createKey<Type extends KmsCreateKeyType>(agentContext: AgentContext, options: KmsCreateKeyOptions<Type>): Promise<KmsCreateKeyReturn<Type>> {
        // check  if a key-id is provided
        options.keyId ??= crypto.randomUUID();

        // we want to create a key pair using the web-crypto api and store the private key in our keystore
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256" // ES256
            },
            true,
            ["sign", "verify"]
        );

        // and return the public key as jwk
        const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

        const jwkKeyPair = {
            publicKey: publicKeyJwk,
            privateKey: privateKeyJwk
        };

        // store the key pair in the keystore
        this.keystore.set(options.keyId, JSON.stringify(jwkKeyPair));

        return await Promise.resolve({
            keyId: options.keyId,
            publicJwk: publicKeyJwk as KmsJwkPublic
        } as KmsCreateKeyReturn<Type>);
    }
    public importKey<Jwk extends KmsJwkPrivate>(agentContext: AgentContext, options: KmsImportKeyOptions<Jwk>): Promise<KmsImportKeyReturn<Jwk>> {
        throw new Error("Method not implemented.");
    }
    public deleteKey(agentContext: AgentContext, options: KmsDeleteKeyOptions): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    public async sign(agentContext: AgentContext, options: KmsSignOptions): Promise<KmsSignReturn> {
        // load key from keystore
        const stringifiedKeyPair = this.keystore.get(options.keyId);
        if (!stringifiedKeyPair) {
            throw new Error(`Key with id ${options.keyId} not found`);
        }
        const privateKeyJwk = (JSON.parse(stringifiedKeyPair) as JwkKeyPair).privateKey;
        const privateKey = await crypto.subtle.importKey(
            "jwk", // format
            privateKeyJwk, // the exported JWK object
            { name: "ECDSA", namedCurve: "P-256" }, // algorithm
            true, // extractable
            ["sign"] // key usages
        );

        // load data from options
        const data = options.data;

        // check if method is ES256
        if (options.algorithm !== "ES256") {
            throw new Error(`Algorithm ${options.algorithm} not supported`);
        }

        // transform the private key to a jwk
        const signatureBuffer = await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" } }, privateKey, data);
        return {
            signature: new Uint8Array(signatureBuffer)
        };
    }

    public async verify(agentContext: AgentContext, options: KmsVerifyOptions): Promise<KmsVerifyReturn> {
        // load key from keystore
        let publicKeyJwk: JsonWebKey;
        if (!options.key.publicJwk) {
            if (!options.key.keyId) {
                throw new Error("Either publicJwk or keyId must be provided");
            }
            const stringifiedKeyPair = this.keystore.get(options.key.keyId);
            if (!stringifiedKeyPair) {
                throw new Error(`Key with id ${options.key.keyId} not found`);
            }
            publicKeyJwk = (JSON.parse(stringifiedKeyPair) as JwkKeyPair).publicKey;
        } else {
            publicKeyJwk = options.key.publicJwk;
        }

        // check algorithm
        if (options.algorithm !== "ES256") {
            throw new Error(`Algorithm ${options.algorithm} not supported`);
        }

        // import the public key
        const publicKey = await crypto.subtle.importKey("jwk", publicKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);

        // verify signature against data
        const isValid = await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, publicKey, options.signature, options.data);
        return {
            verified: isValid
        } as KmsVerifyReturn;
    }
    public encrypt(agentContext: AgentContext, options: KmsEncryptOptions): Promise<KmsEncryptReturn> {
        throw new Error("Method not implemented.");
    }
    public decrypt(agentContext: AgentContext, options: KmsDecryptOptions): Promise<KmsDecryptReturn> {
        throw new Error("Method not implemented.");
    }
    public randomBytes(agentContext: AgentContext, options: KmsRandomBytesOptions): KmsRandomBytesReturn {
        throw new Error("Method not implemented.");
    }
}
