import { Serializable } from "@js-soft/ts-serval";
import { CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, CoreAddress, CoreId, RelationshipTemplateReference } from "../../../src";

describe("RelationshipTemplateReference", function () {
    test("should serialize and deserialize correctly (verbose)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.forIdentity).toBeInstanceOf(CoreAddress);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"RelationshipTemplateReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"forIdentity":${reference.forIdentity!.serialize()}}`
        );
        const deserialized = RelationshipTemplateReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should serialize and deserialize correctly (no type information)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.forIdentity).toBeInstanceOf(CoreAddress);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        const deserialized = RelationshipTemplateReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should serialize and deserialize correctly (from unknown type)", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(RelationshipTemplateReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.forIdentity).toBeInstanceOf(CoreAddress);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"RelationshipTemplateReference","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"forIdentity":${reference.forIdentity!.serialize()}}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as RelationshipTemplateReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should truncate and read in correctly", async function () {
        const reference = RelationshipTemplateReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.relationshipTemplate.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = RelationshipTemplateReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(RelationshipTemplateReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });
});
