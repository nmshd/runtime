import { Serializable } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, CoreCrypto, FileReference } from "../../../src";

describe("FileReference", function () {
    test("should serialize and deserialize correctly (verbose)", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"FileReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = FileReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (from unknown type)", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"FileReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = Serializable.deserializeUnknown(serialized) as FileReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (verbose, with backbone, identity, password, salt)", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10",
            salt: await CoreCrypto.random(16)
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"FileReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":"pin10","salt":"${reference.salt?.toBase64URL()}"}`
        );
        const deserialized = FileReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
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
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pw",
            salt: await CoreCrypto.random(16)
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"FileReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":"pw","salt":"${reference.salt?.toBase64URL()}"}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as FileReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
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
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = FileReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should truncate and read in correctly with backbone, identity, password, salt", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10",
            salt: await CoreCrypto.random(16)
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = FileReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
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
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });
        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}`).toBase64URL();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = FileReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());

        const truncated2 = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}||`).toBase64URL();
        expect(truncated2.length).toBeLessThan(155);
        expect(truncated2.length).toBeGreaterThan(80);
        const deserialized2 = FileReference.fromTruncated(truncated);
        expect(deserialized2).toBeInstanceOf(Serializable);
        expect(deserialized2).toBeInstanceOf(FileReference);
        expect(deserialized2.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized2.id).toBeInstanceOf(CoreId);
        expect(deserialized2.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized2.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should not create a reference with too large passwordType", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordType: "pin20",
                salt: await CoreCrypto.random(16)
            });
        }).rejects.toThrow("FileReference.passwordType");
    });

    test("should not create a reference with non-integer passwordType", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordType: "pin2.4"
            });
        }).rejects.toThrow("FileReference.passwordType");
    });

    test("should not create a reference starting with neither pw nor pin", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordType: "pc",
                salt: await CoreCrypto.random(16)
            });
        }).rejects.toThrow("FileReference.passwordType");
    });

    test("should not create a reference with salt and no passwordType", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                salt: await CoreCrypto.random(16)
            });
        }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
    });

    test("should not create a reference with passwordType and no salt", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordType: "pw"
            });
        }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
    });

    test("should not load a reference with a non-base64 salt", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });

        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}||pw|wrong-salt`).toBase64URL();
        expect(() => FileReference.fromTruncated(truncated)).toThrow("The salt needs to be a Base64 value.");
    });

    test("should not create a reference with a salt of wrong length", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordType: "pw",
                salt: await CoreCrypto.random(8)
            });
        }).rejects.toThrow("must be 16 bytes long");
    });

    test("should not create a reference with too long personalization", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                forIdentityTruncated: "123456"
            });
        }).rejects.toThrow("FileReference.forIdentityTruncated");
    });

    test("should not create a reference with invalid characters in the personalization", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                forIdentityTruncated: "123j"
            });
        }).rejects.toThrow("FileReference.forIdentityTruncated");
    });
});
