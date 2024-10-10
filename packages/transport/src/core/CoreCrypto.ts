import {
    CoreBuffer,
    CryptoCipher,
    CryptoDerivation,
    CryptoEncryption,
    CryptoEncryptionAlgorithm,
    CryptoExchange,
    CryptoExchangeAlgorithm,
    CryptoExchangeKeypair,
    CryptoExchangePublicKey,
    CryptoExchangeSecrets,
    CryptoHashAlgorithm,
    CryptoRandom,
    CryptoSecretKey,
    CryptoSignature,
    CryptoSignatureAlgorithm,
    CryptoSignatureKeypair,
    CryptoSignaturePrivateKey,
    CryptoSignaturePublicKey,
    CryptoSignatures,
    Encoding
} from "@nmshd/crypto";
import { PasswordGenerator } from "../util";
import { TransportError } from "./TransportError";
import { TransportVersion } from "./types/TransportVersion";

export abstract class CoreCrypto {
    /**
     * Generates a keypair for digital signatures. Depending on the given version, different algorithms are used:
     *
     * v1: ECDSA_P521
     *
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving into a new CryptoKeypair
     */
    public static async generateSignatureKeypair(version: TransportVersion = TransportVersion.Latest): Promise<CryptoSignatureKeypair> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoSignatures.generateKeypair(CryptoSignatureAlgorithm.ECDSA_ED25519);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Generates a keypair for key exchange (public key encryption).
     * Depending on the given version, different algorithms are used:
     *
     * v1: ECDH_P521
     *
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving into a new CryptoKeypair
     */
    public static async generateExchangeKeypair(version: TransportVersion = TransportVersion.Latest): Promise<CryptoExchangeKeypair> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoExchange.generateKeypair(CryptoExchangeAlgorithm.ECDH_X25519);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Generates a secret key for symmetric encryption. Depending on the given version, different algorithms are used:
     *
     * v1: AES256_GCM
     *
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving into a new CryptoSecretKey
     */
    public static async generateSecretKey(version: TransportVersion = TransportVersion.Latest): Promise<CryptoSecretKey> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoEncryption.generateKey(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Generates a password derived from a human readable/memorable master password, a unique salt, the given symmetric
     * algorithm and the version. Depending on the given version, different key derivation algorithms are used.
     * Careful, the symmetric algorithm possibly needs to be manually changed depending on the version in addition to
     * the version.
     *
     * v1: blake2b with 150000 iterations
     *
     * @param master The master password as utf-8 encoded string
     * @param salt A salt which is unique to this user/password instance.
     * @param keyAlgorithm The [[CryptoSymmetricAlgorithm]] for which the key should be generated.
     *                     Default is AES256_GCM.
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving in a [[CryptoSecretKey]].
     */
    public static async generatePassword(
        master: string,
        salt = "enmeshed",
        keyAlgorithm: CryptoEncryptionAlgorithm = CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
        version: TransportVersion = TransportVersion.Latest
    ): Promise<CryptoSecretKey> {
        const masterBuffer = CoreBuffer.fromString(master, Encoding.Utf8);
        const saltBuffer = CoreBuffer.fromString(salt, Encoding.Utf8);
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoDerivation.deriveKeyFromMaster(masterBuffer, 150000, keyAlgorithm, saltBuffer);
            default:
                throw this.invalidVersion(version);
        }
    }

    public static async deriveKeyFromBase(
        secret: CryptoSecretKey | CoreBuffer,
        keyId: number,
        context: string,
        keyAlgorithm: CryptoEncryptionAlgorithm = CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
    ): Promise<CryptoSecretKey> {
        let buffer;
        if (secret instanceof CryptoSecretKey) {
            buffer = secret.secretKey;
        } else if (secret instanceof CoreBuffer) {
            buffer = secret;
        } else {
            throw new TransportError("The secret type is invalid.");
        }
        return await CryptoDerivation.deriveKeyFromBase(buffer, keyId, context, keyAlgorithm);
    }

    public static async deriveClient(
        client: CryptoExchangeKeypair,
        serverPublicKey: CryptoExchangePublicKey,
        keyAlgorithm: CryptoEncryptionAlgorithm = CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
        version: TransportVersion = TransportVersion.Latest
    ): Promise<CryptoExchangeSecrets> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                const base: CryptoExchangeSecrets = await CryptoExchange.deriveTemplator(client, serverPublicKey, keyAlgorithm);
                return base;
            default:
                throw this.invalidVersion(version);
        }
    }

    public static async deriveServer(
        server: CryptoExchangeKeypair,
        clientPublicKey: CryptoExchangePublicKey,
        keyAlgorithm: CryptoEncryptionAlgorithm = CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
        version: TransportVersion = TransportVersion.Latest
    ): Promise<CryptoExchangeSecrets> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                const base = await CryptoExchange.deriveRequestor(server, clientPublicKey, keyAlgorithm);
                return base;
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Digitally signs the given content with the given private key.
     *
     * v1: ECDSA_ED25519 with SHA512 hashes
     *
     * @param content The content object which should be signed
     * @param privateKey The private key to sign
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving in a [[CryptoSignature]] object.
     */
    public static async sign(content: CoreBuffer, privateKey: CryptoSignaturePrivateKey, version: TransportVersion = TransportVersion.Latest): Promise<CryptoSignature> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoSignatures.sign(content, privateKey, CryptoHashAlgorithm.SHA512);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Verifies the digital signature of a given content with the given digital
     * signature and public key.
     *
     * @param content The content object which digital signature should be verified
     * @param signature The digital signature itself
     * @param publicKey The public key which should be verified
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving in either true or false, depending whether or not the
     * digital signature is correct or wrong
     */
    public static async verify(
        content: CoreBuffer,
        signature: CryptoSignature,
        publicKey: CryptoSignaturePublicKey,
        version: TransportVersion = TransportVersion.Latest
    ): Promise<boolean> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoSignatures.verify(content, signature, publicKey);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Encrypt the given content with the given secret key.
     *
     * Please use [[deriveKey]], [[generateEncryptionkey]], or [[generatePassword]] to
     * get a secret key. Never transfer secret key over the wire, the key exchange
     * algorithms should take care of that.
     *
     * @param content The content object which should be encrypted
     * @param secretKey The secret key for the encryption
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving in a [[CryptoCipher]] object.
     */
    public static async encrypt(content: CoreBuffer, secretKey: CryptoSecretKey, version: TransportVersion = TransportVersion.Latest): Promise<CryptoCipher> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoEncryption.encrypt(content, secretKey);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Decrypts the given cipher with the given secret key.
     *
     * Please use [[deriveKey]], [[generateEncryptionkey]], or [[generatePassword]] to
     * get a secret key. Never transfer secret key over the wire, the key exchange
     * algorithms should take care of that.
     *
     * @param cipher The content object which should be encrypted.
     * @param secretKey The secret key for the encryption
     * @param version The version which should be used, "latest" is the default.
     * @returns A Promise object resolving with the decrypted content
     */
    public static async decrypt(cipher: CryptoCipher, secretKey: CryptoSecretKey, version: TransportVersion = TransportVersion.Latest): Promise<CoreBuffer> {
        switch (version) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case TransportVersion.V1:
                return await CryptoEncryption.decrypt(cipher, secretKey);
            default:
                throw this.invalidVersion(version);
        }
    }

    /**
     * Creates a random buffer with the given size
     *
     * @param size The length of bytes which should be randomly filled.
     * @returns A Promise object resolving in a randomly filled Buffer of given length.
     */
    public static async random(size: number): Promise<CoreBuffer> {
        return await CryptoRandom.bytes(size);
    }

    public static async createAccountPassword(): Promise<string> {
        return await PasswordGenerator.createStrongPassword(100, 100);
    }

    private static invalidVersion(version: TransportVersion) {
        return new TransportError(`The version ${version} is not supported.`);
    }
}
