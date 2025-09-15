/* eslint-disable no-console */
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
import { ec as EC } from "elliptic";
import _sodium from "libsodium-wrappers";

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
            console.log("FKM: Trying to createKey for type", JSON.stringify(operation.type));
            if (operation.type.kty === "OKP") {
                return true;
            }
            if (operation.type.kty === "EC" && operation.type.crv === "P-256") {
                return true;
            }
            return false;
        }
        if (operation.operation === "verify" && operation.algorithm === "ES256") {
            return true;
        }
        if (operation.operation === "sign" && (operation.algorithm === "EdDSA" || operation.algorithm === "ES256")) {
            return true;
        }
        if (operation.operation === "randomBytes") {
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
        options.keyId ??= "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            // Use libsodium's randombytes_uniform for secure random number generation
            const r = _sodium.randombytes_uniform(16);
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });

        if (options.type.kty === "EC" && options.type.crv === "P-256") {
            // Use P-256 (aka secp256r1)
            const ec = new EC("p256");
            const key = ec.genKeyPair();

            const b64url = (bytes: Uint8Array) => {
                // Convert Uint8Array to string for btoa
                let binary = "";
                for (const byte of bytes) {
                    binary += String.fromCharCode(byte);
                }
                return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
            };

            console.log("FKM: Created EC P-256 key pair", JSON.stringify(key));

            // Public JWK
            const publicJwk = {
                kty: "EC", // Elliptic Curve
                crv: "P-256",
                x: b64url(new Uint8Array(key.getPublic().getX().toArray())),
                y: b64url(new Uint8Array(key.getPublic().getY().toArray()))
            };

            // Private JWK
            const privateJwk = {
                ...publicJwk,
                d: b64url(new Uint8Array(key.getPrivate().toArray()))
            };

            const jwkKeyPair = {
                publicKey: publicJwk,
                privateKey: privateJwk
            };

            console.log("FKM: created jwk-key pair:", JSON.stringify(jwkKeyPair));

            // store the key pair in the keystore
            this.keystore.set(options.keyId, JSON.stringify(jwkKeyPair));

            return await Promise.resolve({
                keyId: options.keyId,
                publicJwk: publicJwk as KmsJwkPublic
            } as KmsCreateKeyReturn<Type>);
        }

        await _sodium.ready;
        const sodium = _sodium;

        const { keyType, publicKey, privateKey } = sodium.crypto_sign_keypair();

        console.log("FKM: key type:", keyType);
        console.log("FKM: options type:", JSON.stringify(options.type));
        const seed = privateKey.slice(0, sodium.crypto_sign_SEEDBYTES);

        const b64url = (bytes: Uint8Array) => sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);

        // Public JWK
        const publicJwk = {
            kty: "OKP", // Octet Key Pair
            crv: "Ed25519",
            x: b64url(publicKey)
        };

        // Private JWK
        const privateJwk = {
            ...publicJwk,
            d: b64url(seed)
        };

        const jwkKeyPair = {
            publicKey: publicJwk,
            privateKey: privateJwk
        };

        // store the key pair in the keystore
        this.keystore.set(options.keyId, JSON.stringify(jwkKeyPair));

        return await Promise.resolve({
            keyId: options.keyId,
            publicJwk: publicJwk as KmsJwkPublic
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

        const { privateKey, publicKey } = JSON.parse(stringifiedKeyPair) as JwkKeyPair;

        if (options.algorithm === "ES256") {
            // Use P-256 (aka secp256r1)
            const ec = new EC("p256");
            if (!privateKey.d) {
                throw new Error("Private JWK does not contain 'd' parameter");
            }

            const b64urlDecode = (b64url: string) => {
                // remove url specific characters
                const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
                return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            };
            const i2hex = (bytes: Uint8Array) => {
                return Array.from(bytes)
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
            };
            const priv = i2hex(b64urlDecode(privateKey.d));
            const key = ec.keyFromPrivate(priv, "hex");

            // we need to hash the data using SHA-256
            const dataHash = ec.hash().update(options.data).digest();
            const signature = key.sign(dataHash);
            const r = new Uint8Array(signature.r.toArray());
            const s = new Uint8Array(signature.s.toArray());
            const signatureBytes = new Uint8Array(r.length + s.length);
            signatureBytes.set(r);
            signatureBytes.set(s, r.length);

            return await Promise.resolve({
                signature: signatureBytes
            } as KmsSignReturn);
        }

        await _sodium.ready;
        const sodium = _sodium;
        const decode = (bytes: string) => sodium.from_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
        // get the priavte key bytes
        if (privateKey.d === undefined) {
            throw new Error("Private key does not contain 'd' parameter");
        }
        const privateKeyBytes = decode(privateKey.d);

        // get the public key bytes
        if (publicKey.x === undefined) {
            throw new Error("Public key does not contain 'x' parameter");
        }
        const publicKeyBytes = decode(publicKey.x);

        // combine the key bytes to a full private key
        const fullPrivateKeyBytes = new Uint8Array(privateKeyBytes.length + publicKeyBytes.length);
        fullPrivateKeyBytes.set(privateKeyBytes);
        fullPrivateKeyBytes.set(publicKeyBytes, privateKeyBytes.length);

        // and use it to sign the data
        const signature = sodium.crypto_sign_detached(options.data, fullPrivateKeyBytes);

        return {
            signature: signature
        };
    }

    public verify(agentContext: AgentContext, options: KmsVerifyOptions): Promise<KmsVerifyReturn> {
        console.log("FKM: verifying signature");
        // Use P-256 (aka secp256r1)
        const ec = new EC("p256");
        if (!options.key.publicJwk) {
            throw new Error("Public JWK is undefined");
        }
        if (options.key.publicJwk.kty !== "EC") {
            throw new Error("Public JWK does not contain 'x' or 'y' parameter");
        }

        const x = options.key.publicJwk.x;
        const y = options.key.publicJwk.y;

        const b64urlDecode = (b64url: string) => {
            // remove url specific characters
            const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
            return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        };

        const i2hex = (bytes: Uint8Array) => {
            return Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        };

        const pub = { x: i2hex(b64urlDecode(x)), y: i2hex(b64urlDecode(y)) };
        const key = ec.keyFromPublic(pub, "hex");

        const signatureBytes = options.signature;
        const r = signatureBytes.subarray(0, 32);
        const s = signatureBytes.subarray(32, 64);
        const signature = { r: i2hex(r), s: i2hex(s) };

        // we need to hash the data using SHA-256
        const dataHash = ec.hash().update(options.data).digest();
        try {
            const verified = key.verify(dataHash, signature);
            return Promise.resolve({ verified: verified } as KmsVerifyReturn);
        } catch (e) {
            console.log("FKM: error during verification", e);
            throw e;
        }
    }

    public encrypt(agentContext: AgentContext, options: KmsEncryptOptions): Promise<KmsEncryptReturn> {
        throw new Error("Method not implemented.");
    }
    public decrypt(agentContext: AgentContext, options: KmsDecryptOptions): Promise<KmsDecryptReturn> {
        throw new Error("Method not implemented.");
    }
    public randomBytes(agentContext: AgentContext, options: KmsRandomBytesOptions): KmsRandomBytesReturn {
        return _sodium.randombytes_buf(options.length); // Uint8Array
    }
}
