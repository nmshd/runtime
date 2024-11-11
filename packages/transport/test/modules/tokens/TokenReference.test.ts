import { Serializable } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, CoreCrypto, TokenReference } from "../../../src";

describe("TokenReference", function () {
    test("should serialize and deserialize correctly (verbose)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"TokenReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = TokenReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (from unknown type)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"TokenReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = Serializable.deserializeUnknown(serialized) as TokenReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (verbose, with backbone, identity, password, salt)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10",
            salt: await CoreCrypto.random(16)
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":"pin10","salt":"${reference.salt?.toBase64URL()}"}`
        );
        const deserialized = TokenReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe("pin10");
        expect(deserialized.salt?.toBase64URL()).toBe(reference.salt?.toBase64URL());
    });

    test("should serialize and deserialize correctly (from unknown type, with backbone, identity, password, salt)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pw",
            salt: await CoreCrypto.random(16)
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":"pw","salt":"${reference.salt?.toBase64URL()}"}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as TokenReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe("pw");
        expect(deserialized.salt?.toBase64URL()).toBe(reference.salt?.toBase64URL());
    });

    test("should truncate and read in correctly", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should truncate and read in correctly with backbone, identity, password, salt", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10",
            salt: await CoreCrypto.random(16)
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe("pin10");
        expect(deserialized.salt?.toBase64URL()).toBe(reference.salt?.toBase64URL());
    });

    test("should read a reference in the old formats", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}`).toBase64URL();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());

        const truncated2 = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}||`).toBase64URL();
        expect(truncated2.length).toBeLessThan(155);
        expect(truncated2.length).toBeGreaterThan(80);
        const deserialized2 = TokenReference.fromTruncated(truncated);
        expect(deserialized2).toBeInstanceOf(Serializable);
        expect(deserialized2).toBeInstanceOf(TokenReference);
        expect(deserialized2.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized2.id).toBeInstanceOf(CoreId);
        expect(deserialized2.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized2.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should not create a reference with too large passwordType", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: "pin20"
            });
        }).rejects.toThrow("TokenReference.passwordType");
    });

    test("should not create a reference with non-integer passwordType", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: "pin2.4"
            });
        }).rejects.toThrow("TokenReference.passwordType");
    });

    test("should not create a reference starting with neither pw nor pin", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: "pc"
            });
        }).rejects.toThrow("TokenReference.passwordType");
    });

    test("should not create a reference with salt and no passwordType", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                salt: await CoreCrypto.random(16)
            });
        }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
    });

    test("should not create a reference with passwordType and no salt", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: "pw"
            });
        }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
    });

    test("should not load a reference with a non-base64 salt", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });

        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}||wrong-salt|pw`).toBase64URL();
        expect(() => TokenReference.fromTruncated(truncated)).toThrow("The salt needs to be a Base64 value.");
    });

    test("should not create a reference with a salt of wrong length", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: "pw",
                salt: await CoreCrypto.random(8)
            });
        }).rejects.toThrow("must be 16 bytes long");
    });

    test("should not create a reference with too long personalization", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                forIdentityTruncated: "123456"
            });
        }).rejects.toThrow("TokenReference.forIdentityTruncated");
    });

    test("should not create a reference with invalid characters in the personalization", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                forIdentityTruncated: "123j"
            });
        }).rejects.toThrow("TokenReference.forIdentityTruncated");
    });
});
