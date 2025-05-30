import { Serializable } from "@js-soft/ts-serval";
import { CoreId, FileReference } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, CoreCrypto } from "../../../src";

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

    test("should serialize and deserialize correctly (verbose, with backbone, identity, passwordProtection)", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordProtection: {
                passwordType: "pin10",
                salt: await CoreCrypto.random(16)
            }
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"FileReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordProtection":{"passwordType":"pin10","salt":"${reference.passwordProtection!.salt.toBase64URL()}"}}`
        );
        const deserialized = FileReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordProtection!.passwordType).toBe("pin10");
        expect(deserialized.passwordProtection!.salt.toBase64URL()).toBe(reference.passwordProtection!.salt.toBase64URL());
    });

    test("should serialize and deserialize correctly (from unknown type, with backbone, identity, passwordProtection)", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordProtection: {
                passwordType: "pw",
                salt: await CoreCrypto.random(16)
            }
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(FileReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"FileReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordProtection":{"passwordType":"pw","salt":"${reference.passwordProtection!.salt.toBase64URL()}"}}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as FileReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordProtection!.passwordType).toBe("pw");
        expect(deserialized.passwordProtection!.salt.toBase64URL()).toBe(reference.passwordProtection!.salt.toBase64URL());
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

    test("should truncate and read in correctly with backbone, identity, passwordProtection", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordProtection: {
                passwordType: "pin10",
                salt: await CoreCrypto.random(16)
            }
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(155);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = FileReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordProtection!.passwordType).toBe("pin10");
        expect(deserialized.passwordProtection!.salt.toBase64URL()).toBe(reference.passwordProtection!.salt.toBase64URL());
    });

    test("should read a reference in the old format", async function () {
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
    });

    test("should not create a reference with too large passwordType", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordProtection: {
                    passwordType: "pin20",
                    salt: await CoreCrypto.random(16)
                }
            });
        }).rejects.toThrow("SharedPasswordProtection.passwordType");
    });

    test("should not create a reference with non-integer passwordType", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordProtection: {
                    passwordType: "pin2.4",
                    salt: await CoreCrypto.random(16)
                }
            });
        }).rejects.toThrow("SharedPasswordProtection.passwordType");
    });

    test("should not create a reference with passwordType starting with neither pw nor pin", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordProtection: {
                    passwordType: "pc" as any,
                    salt: await CoreCrypto.random(16)
                }
            });
        }).rejects.toThrow("SharedPasswordProtection.passwordType");
    });

    test("should not load a reference with a non-base64 salt", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });

        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}||wrong-salt&pw`).toBase64URL();
        expect(() => FileReference.fromTruncated(truncated)).toThrow("The salt needs to be a Base64 value.");
    });

    test("should not create a reference with a salt of wrong length", async function () {
        await expect(async () => {
            FileReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.file.generateUnsafe(),
                passwordProtection: {
                    passwordType: "pw",
                    salt: await CoreCrypto.random(8)
                }
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
