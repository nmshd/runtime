import { Serializable } from "@js-soft/ts-serval";
import { CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, CoreId, FileReference } from "../../../src";

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

    test("should serialize and deserialize correctly (no type information)", async function () {
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

    test("should truncate and read in correctly", async function () {
        const reference = FileReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.file.generateUnsafe()
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = FileReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(FileReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });
});
