import { Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, TokenReference } from "../../../src";

describe("TokenReference", function () {
    test("should serialize and deserialize correctly (verbose)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","forIdentity":"${reference.forIdentity!.serialize()}","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`
        );
        const deserialized = TokenReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should serialize and deserialize correctly (no type information)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.forIdentity).toBeInstanceOf(CoreAddress);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        const deserialized = TokenReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should serialize and deserialize correctly (from unknown type)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.forIdentity).toBeInstanceOf(CoreAddress);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","forIdentity":"${reference.forIdentity!.serialize()}","id":"${reference.id.toString()}","key":${reference.key.serialize(false)}}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as TokenReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });

    test("should truncate and read in correctly", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });
        const truncated = reference.truncate();

        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.forIdentity!.toString()).toStrictEqual(reference.forIdentity!.toString());
    });
});
