import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import {
    AccountController,
    CoreCrypto,
    CoreIdHelper,
    DeviceSharedSecret,
    TokenContentDeviceSharedSecret,
    TokenContentFile,
    TokenContentRelationshipTemplate,
    Transport
} from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TokenContent", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection, { datawalletEnabled: true });

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 3);

        account = accounts[0];
    });
    afterAll(async () => {
        await account.close();

        await connection.close();
    });

    describe("Any Content", function () {
        test("should send the token", async function () {
            const value = Serializable.fromAny({ any: "content", submitted: true });
            expect(value).toBeInstanceOf(JSONWrapper);

            await account.tokens.sendToken({
                expiresAt: CoreDate.utc().add({ days: 5 }),
                content: value,
                ephemeral: false
            });
        });

        test("should correctly store the token (sender)", async function () {
            const tokens = await account.tokens.getTokens();
            expect(tokens).toHaveLength(1);
            const token = tokens[0];
            const content = token.cache!.content as any;
            expect(content).toBeInstanceOf(JSONWrapper);
            expect(content.value.any).toBe("content");
            expect(content.value.submitted).toBe(true);
        });

        test("should correctly serialize the tokens (sender)", async function () {
            const tokens = await account.tokens.getTokens();
            expect(tokens).toHaveLength(1);
            const token = tokens[0];
            const object = token.toJSON() as any;
            expect(object.cache.content).toBeDefined();
            expect(object.cache.content.any).toBe("content");
            expect(object.cache.content.submitted).toBe(true);
        });
    });

    describe("TokenContentRelationshipTemplate", function () {
        test("should serialize and deserialize correctly (verbose)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordType: "pw",
                salt: await CoreCrypto.random(16)
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.templateId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(
                `{"@type":"TokenContentRelationshipTemplate","forIdentity":"${token.forIdentity!.serialize()}","passwordType":"${token.passwordType}","salt":"${token.salt?.toBase64URL()}","secretKey":${token.secretKey.serialize(false)},"templateId":"${token.templateId.toString()}"}`
            );
            const deserialized = TokenContentRelationshipTemplate.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.templateId).toBeInstanceOf(CoreId);
            expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
            expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordType).toBe("pw");
            expect(deserialized.salt).toStrictEqual(token.salt);
        });

        test("should serialize and deserialize correctly (no type information)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordType: "pin10",
                salt: await CoreCrypto.random(16)
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.templateId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            const deserialized = TokenContentRelationshipTemplate.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.templateId).toBeInstanceOf(CoreId);
            expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
            expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordType).toBe("pin10");
            expect(deserialized.salt).toStrictEqual(token.salt);
        });

        test("should serialize and deserialize correctly (from unknown type)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordType: "pw",
                salt: await CoreCrypto.random(16)
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.templateId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(
                `{"@type":"TokenContentRelationshipTemplate","forIdentity":"${token.forIdentity!.serialize()}","passwordType":"${token.passwordType}","salt":"${token.salt?.toBase64URL()}","secretKey":${token.secretKey.serialize(false)},"templateId":"${token.templateId.toString()}"}`
            );
            const deserialized = Serializable.deserializeUnknown(serialized) as TokenContentRelationshipTemplate;
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.templateId).toBeInstanceOf(CoreId);
            expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
            expect(deserialized.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordType).toBe("pw");
            expect(deserialized.salt).toStrictEqual(token.salt);
        });

        test("should not create a tokenContentt with too large passwordType", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordType: "pin20",
                    salt: await CoreCrypto.random(16)
                });
            }).rejects.toThrow("TokenContentRelationshipTemplate.passwordType");
        });

        test("should not create a reference with non-integer passwordType", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordType: "pin2.4",
                    salt: await CoreCrypto.random(16)
                });
            }).rejects.toThrow("TokenContentRelationshipTemplate.passwordType");
        });

        test("should not create a reference starting with neither pw nor pin", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordType: "pc",
                    salt: await CoreCrypto.random(16)
                });
            }).rejects.toThrow("TokenContentRelationshipTemplate.passwordType");
        });

        test("should not create a reference with salt and no passwordType", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    salt: await CoreCrypto.random(16)
                });
            }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
        });

        test("should not create a reference with passwordType and no salt", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordType: "pw"
                });
            }).rejects.toThrow("It's not possible to have only one of passwordType and salt set.");
        });

        test("should not create a reference with a salt of wrong length", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordType: "pw",
                    salt: await CoreCrypto.random(8)
                });
            }).rejects.toThrow("must be 16 bytes long");
        });
    });

    describe("TokenContentDeviceSharedSecret", function () {
        test("should serialize and deserialize correctly (verbose)", async function () {
            const device = await account.devices.sendDevice({
                name: "test",
                description: "test",
                isAdmin: true
            });
            await account.syncDatawallet();
            const sharedSecret = await account.devices.getSharedSecret(device.id);
            const token = TokenContentDeviceSharedSecret.from({
                sharedSecret: sharedSecret
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(token.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(`{"@type":"TokenContentDeviceSharedSecret","sharedSecret":${token.sharedSecret.serialize(false)}}`);
            const deserialized = TokenContentDeviceSharedSecret.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(deserialized.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            await TestUtil.onboardDevice(transport, deserialized.sharedSecret);
        });

        test("should serialize and deserialize correctly (no type information)", async function () {
            const device = await account.devices.sendDevice({
                name: "test",
                description: "test",
                isAdmin: true
            });
            await account.syncDatawallet();
            const sharedSecret = await account.devices.getSharedSecret(device.id);
            const token = TokenContentDeviceSharedSecret.from({
                sharedSecret: sharedSecret
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(token.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            const deserialized = TokenContentDeviceSharedSecret.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(deserialized.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            await TestUtil.onboardDevice(transport, deserialized.sharedSecret);
        });

        test("should serialize and deserialize correctly (from unknown type)", async function () {
            const device = await account.devices.sendDevice({
                name: "test",
                description: "test",
                isAdmin: true
            });
            await account.syncDatawallet();
            const sharedSecret = await account.devices.getSharedSecret(device.id);
            const token = TokenContentDeviceSharedSecret.from({
                sharedSecret: sharedSecret
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(token.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(`{"@type":"TokenContentDeviceSharedSecret","sharedSecret":${token.sharedSecret.serialize(false)}}`);
            const deserialized = Serializable.deserializeUnknown(serialized) as TokenContentDeviceSharedSecret;
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentDeviceSharedSecret);
            expect(deserialized.sharedSecret).toBeInstanceOf(DeviceSharedSecret);
            await TestUtil.onboardDevice(transport, deserialized.sharedSecret);
        });
    });

    describe("TokenContentFile", function () {
        test("should serialize and deserialize correctly (verbose)", async function () {
            const token = TokenContentFile.from({
                secretKey: await CryptoEncryption.generateKey(),
                fileId: await CoreIdHelper.notPrefixed.generate()
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentFile);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.fileId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(`{"@type":"TokenContentFile","fileId":"${token.fileId.toString()}","secretKey":${token.secretKey.serialize(false)}}`);
            const deserialized = TokenContentFile.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentFile);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.fileId).toBeInstanceOf(CoreId);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.fileId.toString()).toStrictEqual(token.fileId.toString());
        });

        test("should serialize and deserialize correctly (no type information)", async function () {
            const token = TokenContentFile.from({
                secretKey: await CryptoEncryption.generateKey(),
                fileId: await CoreIdHelper.notPrefixed.generate()
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentFile);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.fileId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            const deserialized = TokenContentFile.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentFile);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.fileId).toBeInstanceOf(CoreId);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.fileId.toString()).toStrictEqual(token.fileId.toString());
        });

        test("should serialize and deserialize correctly (from unknown type)", async function () {
            const token = TokenContentFile.from({
                secretKey: await CryptoEncryption.generateKey(),
                fileId: await CoreIdHelper.notPrefixed.generate()
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentFile);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.fileId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(`{"@type":"TokenContentFile","fileId":"${token.fileId.toString()}","secretKey":${token.secretKey.serialize(false)}}`);
            const deserialized = Serializable.deserializeUnknown(serialized) as TokenContentFile;
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentFile);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.fileId).toBeInstanceOf(CoreId);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.fileId.toString()).toStrictEqual(token.fileId.toString());
        });
    });
});
