import { CoreBuffer, CryptoSignatureKeypair } from "@nmshd/crypto";
import { CoreCrypto } from "@nmshd/transport";

describe("Crypto", function () {
    test("generates a Keypair", async function () {
        const keypair = await CoreCrypto.generateSignatureKeypair();
        expect(keypair.privateKey).toBeDefined();
    });

    test("signs correctly with a keypair", async function () {
        const keypair = await CoreCrypto.generateSignatureKeypair();
        expect(keypair.privateKey).toBeDefined();

        const content = CoreBuffer.fromUtf8("Test");
        const signature = await CoreCrypto.sign(content, keypair.privateKey);
        const valid = await CoreCrypto.verify(content, signature, keypair.publicKey);
        expect(valid).toBe(true);
    });

    test("signs correctly with a serialized keypair", async function () {
        const keypair = await CoreCrypto.generateSignatureKeypair();
        const serializedKeypair = keypair.toJSON();
        const keypair2 = CryptoSignatureKeypair.fromJSON(serializedKeypair);
        expect(keypair2.publicKey).toBeDefined();
        expect(keypair2.privateKey).toBeDefined();

        const content = CoreBuffer.fromUtf8("Test");
        const signature = await CoreCrypto.sign(content, keypair2.privateKey);
        const valid = await CoreCrypto.verify(content, signature, keypair2.publicKey);
        expect(valid).toBe(true);
    });
});
