import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CryptoExchangeKeypair, CryptoSecretKey, CryptoSignatureKeypair } from "@nmshd/crypto";
import { AccountController, CoreCrypto, SecretContainerPlain, SecretController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil";

let connection: IDatabaseConnection;

let transport: Transport;
let account: AccountController;
let subject: AccountController;
let secretKey: CryptoSecretKey;
let signatureKeypair: CryptoSignatureKeypair;
let exchangeKeypair: CryptoExchangeKeypair;
let secretController: SecretController;

describe("SecretController", function () {
    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        account = accounts[0];
        subject = accounts[1];
        secretController = await new SecretController(account).init();
    });

    afterAll(async function () {
        await account.close();
        await subject.close();
        await connection.close();
    });

    test("should store and load a SignatureKeypair by Id", async function () {
        const keypair = await CoreCrypto.generateSignatureKeypair();
        signatureKeypair = keypair;
        const secretContainer = await secretController.storeSecret(keypair, "test");

        const secretContainerLoaded = await secretController.loadSecretById(secretContainer.id);

        expect(secretContainerLoaded).toBeDefined();

        if (!secretContainerLoaded) return;

        expect(secretContainerLoaded.secret).toBeInstanceOf(CryptoSignatureKeypair);

        const loadedSecret = secretContainerLoaded.secret as unknown as CryptoSignatureKeypair;
        expect(loadedSecret.privateKey.toBase64()).toStrictEqual(keypair.privateKey.toBase64());
        expect(loadedSecret.publicKey.toBase64()).toStrictEqual(keypair.publicKey.toBase64());
    });

    test("should store and load an ExchangeKeypair by Id", async function () {
        const keypair = await CoreCrypto.generateExchangeKeypair();
        exchangeKeypair = keypair;
        const secretContainer = await secretController.storeSecret(keypair, "test");

        const secretContainerLoaded = await secretController.loadSecretById(secretContainer.id);

        expect(secretContainerLoaded).toBeDefined();

        if (!secretContainerLoaded) return;

        expect(secretContainerLoaded.secret).toBeInstanceOf(CryptoExchangeKeypair);
        const loadedSecret = secretContainerLoaded.secret as unknown as CryptoExchangeKeypair;
        expect(loadedSecret.privateKey.toBase64()).toStrictEqual(keypair.privateKey.toBase64());
        expect(loadedSecret.publicKey.toBase64()).toStrictEqual(keypair.publicKey.toBase64());
    });

    test("should store and load a SecretKey by Id", async function () {
        const key = await CoreCrypto.generateSecretKey();
        secretKey = key;
        const secretContainer = await secretController.storeSecret(key, "test");

        const secretContainerLoaded = await secretController.loadSecretById(secretContainer.id);

        expect(secretContainerLoaded).toBeDefined();

        if (!secretContainerLoaded) return;

        expect(secretContainerLoaded.secret).toBeInstanceOf(CryptoSecretKey);
        const loadedSecret = secretContainerLoaded.secret as unknown as CryptoSecretKey;
        expect(loadedSecret.secretKey.toBase64()).toStrictEqual(key.secretKey.toBase64());
    });

    test("should load the synchronizedSecrets by Name", async function () {
        const synchronizedSecrets: SecretContainerPlain[] = await secretController.loadSecretsByName("test");
        expect(synchronizedSecrets).toHaveLength(3);
        for (const secret of synchronizedSecrets) {
            expect(secret.secret).toBeDefined();

            if (secret.secret instanceof CryptoSignatureKeypair) {
                const loadedSecret = secret.secret;
                expect(loadedSecret.privateKey.toBase64()).toStrictEqual(signatureKeypair.privateKey.toBase64());
                expect(loadedSecret.publicKey.toBase64()).toStrictEqual(signatureKeypair.publicKey.toBase64());
            } else if (secret.secret instanceof CryptoExchangeKeypair) {
                const loadedSecret = secret.secret;
                expect(loadedSecret.privateKey.toBase64()).toStrictEqual(exchangeKeypair.privateKey.toBase64());
                expect(loadedSecret.publicKey.toBase64()).toStrictEqual(exchangeKeypair.publicKey.toBase64());
            } else if (secret.secret instanceof CryptoSecretKey) {
                const loadedSecret = secret.secret;
                expect(loadedSecret.secretKey.toBase64()).toStrictEqual(secretKey.secretKey.toBase64());
            } else {
                throw new Error("Secret type mismatch!");
            }
        }
    });
});
