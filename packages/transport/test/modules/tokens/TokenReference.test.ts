import { Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { BackboneIds, TokenReference } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

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

    test("should serialize and deserialize correctly (verbose, with backbone, identity, password)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: 10
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":10}`
        );
        const deserialized = TokenReference.deserialize(serialized);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should serialize and deserialize correctly (from unknown type, with backbone, identity, password)", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: 10
        });
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        const serialized = reference.serialize();
        expect(typeof serialized).toBe("string");
        expect(serialized).toBe(
            `{"@type":"TokenReference","backboneBaseUrl":"localhost","forIdentityTruncated":"1234","id":"${reference.id.toString()}","key":${reference.key.serialize(false)},"passwordType":10}`
        );
        const deserialized = Serializable.deserializeUnknown(serialized) as TokenReference;
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should truncate and read in correctly", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should truncate and read in correctly with backbone, password and personalization", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe(),
            backboneBaseUrl: "localhost",
            forIdentityTruncated: "1234",
            passwordType: 10
        });
        const truncated = reference.truncate();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
        expect(deserialized.backboneBaseUrl).toBe("localhost");
        expect(deserialized.forIdentityTruncated).toBe("1234");
        expect(deserialized.passwordType).toBe(10);
    });

    test("should read a reference in the old format", async function () {
        const reference = TokenReference.from({
            key: await CryptoEncryption.generateKey(),
            id: await BackboneIds.token.generateUnsafe()
        });
        const truncated = CoreBuffer.fromUtf8(`${reference.id.toString()}|${reference.key.algorithm}|${reference.key.secretKey.toBase64URL()}`).toBase64URL();
        expect(truncated.length).toBeLessThan(115);
        expect(truncated.length).toBeGreaterThan(80);
        const deserialized = TokenReference.fromTruncated(truncated);
        expect(deserialized).toBeInstanceOf(Serializable);
        expect(deserialized).toBeInstanceOf(TokenReference);
        expect(deserialized.key).toBeInstanceOf(CryptoSecretKey);
        expect(deserialized.id).toBeInstanceOf(CoreId);
        expect(deserialized.key.toBase64()).toStrictEqual(reference.key.toBase64());
        expect(deserialized.id.toString()).toStrictEqual(reference.id.toString());
    });

    test("should not create a reference with too large passwordType", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: 20
            });
        }).rejects.toThrow("TokenReference.passwordType");
    });

    test("should not create a reference with non-integer passwordType", async function () {
        await expect(async () => {
            TokenReference.from({
                key: await CryptoEncryption.generateKey(),
                id: await BackboneIds.token.generateUnsafe(),
                passwordType: 2.4
            });
        }).rejects.toThrow("TokenReference.passwordType");
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

    test("should correctly create a reference to a token", async function () {
        const connection = await TestUtil.createDatabaseConnection();
        const transport = TestUtil.createTransport(connection);
        await transport.init();
        const account = (await TestUtil.provideAccounts(transport, 1))[0];

        const content = Serializable.fromAny({ content: "TestToken" });
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const sentToken = await account.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });

        const reference = sentToken.toTokenReference();
        expect(reference).toBeInstanceOf(Serializable);
        expect(reference).toBeInstanceOf(TokenReference);
        expect(reference.key).toBeInstanceOf(CryptoSecretKey);
        expect(reference.id).toBeInstanceOf(CoreId);
        expect(reference.id.equals(sentToken.id)).toBe(true);
        expect(reference.backboneBaseUrl).toBe("localhost");

        await account.close();
        await connection.close();
    });
});
