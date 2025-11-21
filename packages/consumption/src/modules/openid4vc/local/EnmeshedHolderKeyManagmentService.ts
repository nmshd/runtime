import { AgentContext, Kms } from "@credo-ts/core";
import { ec as EC } from "elliptic";

import { SodiumWrapper } from "@nmshd/crypto";
import sjcl from "sjcl";
import { KeyStorage } from "./KeyStorage";

export interface JwkKeyPair {
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
    keyType?: string;
}

export class EnmshedHolderKeyManagmentService implements Kms.KeyManagementService {
    public static readonly backend = "enmeshed";

    public readonly backend = EnmshedHolderKeyManagmentService.backend;

    private readonly b64url = (bytes: Uint8Array) => SodiumWrapper.sodium.to_base64(bytes, (SodiumWrapper.sodium as any).base64_variants.URLSAFE_NO_PADDING);
    private readonly b64urlDecode = (b64url: string) => SodiumWrapper.sodium.from_base64(b64url, (SodiumWrapper.sodium as any).base64_variants.URLSAFE_NO_PADDING);

    // please note: we cannot use buffer here - because it is not available in the browser
    // and yes it could be pollyfilled but that extends the bundle size for no good reason
    private readonly buf2hex = (bytes: Uint8Array) => {
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    };
    private readonly hex2buf = (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    };

    public constructor(private readonly keyStorage: KeyStorage) {}

    public isOperationSupported(agentContext: AgentContext, operation: Kms.KmsOperation): boolean {
        agentContext.config.logger.debug(`EKM: Checking if operation is supported: ${JSON.stringify(operation)}`);
        if (operation.operation === "createKey") {
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
        if (operation.operation === "deleteKey") {
            return true;
        }
        if (operation.operation === "encrypt") {
            return true;
        }
        return false;
    }
    public async getPublicKey(agentContext: AgentContext, keyId: string): Promise<Kms.KmsJwkPublic> {
        const keyPair = await this.keyStorage.getKey(keyId);
        if (!keyPair) {
            agentContext.config.logger.error(`EKM: Key with id ${keyId} not found`);
            throw new Error(`Key with id ${keyId} not found`);
        }

        return (JSON.parse(keyPair) as JwkKeyPair).publicKey as Kms.KmsJwkPublic;
    }
    public async createKey<Type extends Kms.KmsCreateKeyType>(agentContext: AgentContext, options: Kms.KmsCreateKeyOptions<Type>): Promise<Kms.KmsCreateKeyReturn<Type>> {
        options.keyId ??= "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            // Use libsodium's randombytes_uniform for secure random number generation
            const r = SodiumWrapper.sodium.randombytes_uniform(16);
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });

        agentContext.config.logger.debug(`EKM: Creating key with id ${options.keyId} and type ${JSON.stringify(options.type)}`);

        if (options.type.kty === "EC" && options.type.crv === "P-256") {
            // Use P-256 (aka secp256r1)
            const ec = new EC("p256");
            const key = ec.genKeyPair();

            // Public JWK
            const publicJwk = {
                kty: "EC", // Elliptic Curve
                crv: "P-256",
                x: this.b64url(new Uint8Array(key.getPublic().getX().toArray())),
                y: this.b64url(new Uint8Array(key.getPublic().getY().toArray()))
            };

            // Private JWK
            const privateJwk = {
                ...publicJwk,
                d: this.b64url(new Uint8Array(key.getPrivate().toArray()))
            };

            const jwkKeyPair = {
                publicKey: publicJwk,
                privateKey: privateJwk,
                keyType: "EC"
            };

            agentContext.config.logger.debug(`EKM: Created EC key pair with id ${options.keyId}`);
            // store the key pair in the keystore
            await this.keyStorage.storeKey(options.keyId, JSON.stringify(jwkKeyPair));

            return { keyId: options.keyId, publicJwk: publicJwk as Kms.KmsJwkPublic } as Kms.KmsCreateKeyReturn<Type>;
        }

        const { keyType, publicKey, privateKey } = SodiumWrapper.sodium.crypto_sign_keypair();
        agentContext.config.logger.debug(`EKM: Created OKP key pair with id ${options.keyId} and keyType ${keyType}`);
        const seed = privateKey.slice(0, (SodiumWrapper.sodium as any).crypto_sign_SEEDBYTES);

        // Public JWK
        const publicJwk = {
            kty: "OKP", // Octet Key Pair
            crv: "Ed25519",
            x: this.b64url(publicKey)
        };

        // Private JWK
        const privateJwk = {
            ...publicJwk,
            d: this.b64url(seed)
        };

        const jwkKeyPair = {
            publicKey: publicJwk,
            privateKey: privateJwk,
            keyType: "OKP"
        };

        await this.keyStorage.storeKey(options.keyId, JSON.stringify(jwkKeyPair));
        return { keyId: options.keyId, publicJwk: publicJwk as Kms.KmsJwkPublic } as Kms.KmsCreateKeyReturn<Type>;
    }

    public importKey<Jwk extends Kms.KmsJwkPrivate>(agentContext: AgentContext, options: Kms.KmsImportKeyOptions<Jwk>): Promise<Kms.KmsImportKeyReturn<Jwk>> {
        agentContext.config.logger.debug(`EKM: Importing key with  ${JSON.stringify(options)}`);
        throw new Error("Method not implemented.");
    }

    public async deleteKey(agentContext: AgentContext, options: Kms.KmsDeleteKeyOptions): Promise<boolean> {
        const hasKey = await this.keyStorage.hasKey(options.keyId);
        if (!hasKey) throw new Error(`key with id ${options.keyId} not found. and cannot be deleted`);

        agentContext.config.logger.debug(`EKM: Deleting key with id ${options.keyId}`);
        await this.keyStorage.deleteKey(options.keyId);
        return true;
    }

    public async sign(agentContext: AgentContext, options: Kms.KmsSignOptions): Promise<Kms.KmsSignReturn> {
        agentContext.config.logger.debug(`EKM: Signing data with key id ${options.keyId} using algorithm ${options.algorithm}`);

        const stringifiedKeyPair = await this.keyStorage.getKey(options.keyId);
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

            const priv = this.buf2hex(this.b64urlDecode(privateKey.d));
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
            } as Kms.KmsSignReturn);
        }

        const decode = (bytes: string) => SodiumWrapper.sodium.from_base64(bytes, (SodiumWrapper.sodium as any).base64_variants.URLSAFE_NO_PADDING);
        // get the private key bytes
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
        const signature = SodiumWrapper.sodium.crypto_sign_detached(options.data, fullPrivateKeyBytes);

        return {
            signature: signature as Uint8Array<ArrayBuffer> // I hope this cast doesn't paper over something
        };
    }

    public verify(agentContext: AgentContext, options: Kms.KmsVerifyOptions): Promise<Kms.KmsVerifyReturn> {
        agentContext.config.logger.debug(`EKM: Verifying signature with key id ${options.key.keyId} using algorithm ${options.algorithm}`);
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

        const pub = { x: this.buf2hex(this.b64urlDecode(x)), y: this.buf2hex(this.b64urlDecode(y)) };
        const key = ec.keyFromPublic(pub, "hex");

        const signatureBytes = options.signature;
        const r = signatureBytes.subarray(0, 32);
        const s = signatureBytes.subarray(32, 64);
        const signature = { r: this.buf2hex(r), s: this.buf2hex(s) };

        // we need to hash the data using SHA-256
        const dataHash = ec.hash().update(options.data).digest();
        try {
            const verified = key.verify(dataHash, signature);
            return Promise.resolve({ verified: verified } as Kms.KmsVerifyReturn);
        } catch (e) {
            agentContext.config.logger.error(`EKM: Error during signature verification: ${e}`);
            throw e;
        }
    }

    private async ecdhEs(localKeyId: string, remotePublicJWK: any): Promise<Uint8Array> {
        const keyPairString = await this.keyStorage.getKey(localKeyId);
        if (!keyPairString) {
            throw new Error(`Key with id ${localKeyId} not found`);
        }

        const localKeyPair = JSON.parse(keyPairString) as JwkKeyPair;
        if (localKeyPair.keyType !== "EC") {
            throw new Error("Key type is not EC");
        }

        const ec = new EC("p256");

        if (localKeyPair.privateKey.d === undefined) {
            throw new Error("Local private key does not contain 'd' parameter");
        }
        const localPriv = ec.keyFromPrivate(this.buf2hex(this.b64urlDecode(localKeyPair.privateKey.d)), "hex");
        // the remote jwk is base64url encoded - we again decode and transform to hex to receive a fitting public key
        const remoteBasePoint = ec.keyFromPublic(
            {
                x: this.buf2hex(this.b64urlDecode(remotePublicJWK.x)),
                y: this.buf2hex(this.b64urlDecode(remotePublicJWK.y))
            },
            "hex"
        );

        const sharedSecret = localPriv.derive(remoteBasePoint.getPublic());
        const sharedBytes = new Uint8Array(sharedSecret.toArray("be"));
        return sharedBytes;
    }

    // UTF-8 encode helper
    private utf8(str: string): Uint8Array {
        return new TextEncoder().encode(str);
    }

    // Concat Uint8Arrays
    private concat(...arrays: Uint8Array[]): Uint8Array {
        const total = arrays.reduce((sum, a) => sum + a.length, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const a of arrays) {
            out.set(a, offset);
            offset += a.length;
        }
        return out;
    }

    // Encode a 32-bit big-endian length prefix
    private lenPrefix(data: Uint8Array): Uint8Array {
        const buf = new Uint8Array(4 + data.length);
        const view = new DataView(buf.buffer);
        view.setUint32(0, data.length, false); // big-endian
        buf.set(data, 4);
        return buf;
    }

    private concatKdf(sharedSecret: Uint8Array, keyLength: number, algorithmDescriptor: string, keyAgreement: any): Uint8Array {
        if (keyAgreement.apu === undefined) {
            throw new Error("Key agreement apu is undefined");
        }
        if (keyAgreement.apv === undefined) {
            throw new Error("Key agreement apv is undefined");
        }

        const algId = this.lenPrefix(this.utf8(algorithmDescriptor));
        const partyU = this.lenPrefix(keyAgreement.apu);
        const partyV = this.lenPrefix(keyAgreement.apv);

        const suppPubInfo = new Uint8Array(4);
        new DataView(suppPubInfo.buffer).setUint32(0, keyLength, false);
        const suppPrivInfo = new Uint8Array(0);
        const otherInfo = this.concat(algId, partyU, partyV, suppPubInfo, suppPrivInfo);
        const counter = new Uint8Array([0, 0, 0, 1]);
        const input = this.concat(counter, sharedSecret, otherInfo);

        // Hash with SHA-256 (SJCL)
        const inputHex = this.buf2hex(input);
        const inputBits = sjcl.codec.hex.toBits(inputHex);
        const hashBits = sjcl.hash.sha256.hash(inputBits);
        const hashHex = sjcl.codec.hex.fromBits(hashBits);
        const hashBuf = this.hex2buf(hashHex);

        // Truncate to desired key length
        return hashBuf.subarray(0, keyLength / 8);
    }

    public async encrypt(agentContext: AgentContext, options: Kms.KmsEncryptOptions): Promise<Kms.KmsEncryptReturn> {
        try {
            // encryption via A-256-GCM
            // we will call the services side bob and the incoming side alice
            if (options.key.keyAgreement === undefined) {
                throw new Error("Key agreement is undefined");
            }
            if (options.key.keyAgreement.keyId === undefined) {
                throw new Error("Key agreement keyId is undefined");
            }

            // 1. derive the shared secret via ECDH-ES
            const sharedSecret = await this.ecdhEs(options.key.keyAgreement.keyId, options.key.keyAgreement.externalPublicJwk);
            agentContext.config.logger.debug(`EKM: Derived shared secret for encryption using ECDH-ES`);
            // 2. Concat KDF to form the final key
            const derivedKey = this.concatKdf(sharedSecret, 256, "A256GCM", options.key.keyAgreement);
            // 3. Encrypt the data via AES-256-GCM using libsodium

            // create nonce
            const iv = crypto.getRandomValues(new Uint8Array(12));
            // transform to bit arrays for sjcl
            const keyBits = sjcl.codec.hex.toBits(this.buf2hex(derivedKey));
            const dataBits = sjcl.codec.hex.toBits(this.buf2hex(options.data));
            const ivBits = sjcl.codec.hex.toBits(this.buf2hex(iv));
            // do not forget to add the additional authenticated data
            const aadBits = "aad" in options.encryption && options.encryption.aad ? sjcl.codec.hex.toBits(this.buf2hex(options.encryption.aad)) : [];
            // setup aes
            const aes = new sjcl.cipher.aes(keyBits);
            // encrypt
            const cyphertextBits = sjcl.mode.gcm.encrypt(aes, dataBits, ivBits, aadBits, 128);

            // transform back to byte array
            const cyphertextBuf = this.hex2buf(sjcl.codec.hex.fromBits(cyphertextBits));
            // In SJCL, GCM output = ciphertext || tag
            const cyphertext = cyphertextBuf.subarray(0, cyphertextBuf.length - 16);
            const tag = cyphertextBuf.subarray(cyphertextBuf.length - 16);

            const returnValue = {
                encrypted: cyphertext,
                iv: iv,
                tag: tag
            };

            return returnValue;
        } catch (e) {
            agentContext.config.logger.error(`EKM: Error during encryption: ${e}`);
            throw e;
        }
    }

    public decrypt(agentContext: AgentContext, options: Kms.KmsDecryptOptions): Promise<Kms.KmsDecryptReturn> {
        agentContext.config.logger.debug(`EKM: Decrypting data with key id ${options.key.keyId} using options ${options}`);
        throw new Error("Method not implemented.");
    }
    public randomBytes(agentContext: AgentContext, options: Kms.KmsRandomBytesOptions): Kms.KmsRandomBytesReturn {
        agentContext.config.logger.debug(`EKM: Generating ${options.length} random bytes`);
        return SodiumWrapper.sodium.randombytes_buf(options.length); // Uint8Array
    }
}
