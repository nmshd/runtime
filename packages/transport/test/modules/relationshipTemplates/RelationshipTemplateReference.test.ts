import { Serializable } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, RelationshipTemplateReference } from "../../../src";

describe("RelationshipTemplateReference", function () {
    test("should serialize and deserialize correctly (verbose)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"RelationshipTemplateReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = RelationshipTemplateReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (from unknown type)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe()
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(`{"@type":"RelationshipTemplateReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`);
        const deserialized = Serializable.deserializeUnknown(serialized) as RelationshipTemplateReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should serialize and deserialize correctly (verbose, with backbone, identity, password)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10"
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"RelationshipTemplateReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":pin10}`
        );
        const deserialized = RelationshipTemplateReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should serialize and deserialize correctly (from unknown type, with backbone, identity, password)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10"
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"RelationshipTemplateReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":pin10}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as RelationshipTemplateReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should truncate and read in correctly", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe()
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = RelationshipTemplateReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should truncate and read in correctly with backbone, identity, password", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: "pin10"
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = RelationshipTemplateReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should read a reference in the old format", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe()
        });
        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}`).toBase64URL();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = RelationshipTemplateReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should not create a reference with too large passwordType", async function () {
        await expect(async () => {
            RelationshipTemplateReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.relationshipTemplate.generateUnsafe(),
                passwordType: "pin20"
            });
        }).rejects.toThrow("RelationshipTemplateReference.passwordType");
    });

    test("should not create a reference with non-integer passwordType", async function () {
        await expect(async () => {
            RelationshipTemplateReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.relationshipTemplate.generateUnsafe(),
                passwordType: "pin2.4"
            });
        }).rejects.toThrow("RelationshipTemplateReference.passwordType");
    });

    test("should not create a reference with too long personalization", async function () {
        await expect(async () => {
            RelationshipTemplateReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.relationshipTemplate.generateUnsafe(),
                forIdentityTruncated: "123456"
            });
        }).rejects.toThrow("RelationshipTemplateReference.forIdentityTruncated");
    });

    test("should not create a reference with invalid characters in the personalization", async function () {
        await expect(async () => {
            RelationshipTemplateReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.relationshipTemplate.generateUnsafe(),
                forIdentityTruncated: "123j"
            });
        }).rejects.toThrow("RelationshipTemplateReference.forIdentityTruncated");
    });
});
