import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreCrypto, DeviceSharedSecret, TokenContentDeviceSharedSecret, TokenContentFile, TokenContentRelationshipTemplate, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TokenContent", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport({ datawalletEnabled: true });

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 3);

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
            const content = token.content as any;
            expect(content).toBeInstanceOf(JSONWrapper);
            expect(content.value.any).toBe("content");
            expect(content.value.submitted).toBe(true);
        });

        test("should correctly serialize the tokens (sender)", async function () {
            const tokens = await account.tokens.getTokens();
            expect(tokens).toHaveLength(1);
            const token = tokens[0];
            const object = token.toJSON() as any;
            expect(object.content).toBeDefined();
            expect(object.content.any).toBe("content");
            expect(object.content.submitted).toBe(true);
        });
    });

    describe("TokenContentRelationshipTemplate", function () {
        test("should serialize and deserialize correctly (verbose)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordProtection: {
                    passwordType: "pw",
                    salt: await CoreCrypto.random(16)
                }
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.templateId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(
                `{"@type":"TokenContentRelationshipTemplate","forIdentity":"${token.forIdentity!.serialize()}","passwordProtection":{"passwordType":"${token.passwordProtection!.passwordType}","salt":"${token.passwordProtection!.salt.toBase64URL()}"},"secretKey":${token.secretKey.serialize(false)},"templateId":"${token.templateId.toString()}"}`
            );
            const deserialized = TokenContentRelationshipTemplate.deserialize(serialized);
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.templateId).toBeInstanceOf(CoreId);
            expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
            expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordProtection!.passwordType).toBe("pw");
            expect(deserialized.passwordProtection!.salt).toStrictEqual(token.passwordProtection!.salt);
        });

        test("should serialize and deserialize correctly (no type information)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordProtection: {
                    passwordType: "pin10",
                    salt: await CoreCrypto.random(16)
                }
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
            expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordProtection!.passwordType).toBe("pin10");
            expect(deserialized.passwordProtection!.salt).toStrictEqual(token.passwordProtection!.salt);
        });

        test("should serialize and deserialize correctly (from unknown type)", async function () {
            const token = TokenContentRelationshipTemplate.from({
                secretKey: await CryptoEncryption.generateKey(),
                templateId: await CoreIdHelper.notPrefixed.generate(),
                forIdentity: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                passwordProtection: {
                    passwordType: "pw",
                    salt: await CoreCrypto.random(16)
                }
            });
            expect(token).toBeInstanceOf(Serializable);
            expect(token).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(token.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(token.templateId).toBeInstanceOf(CoreId);
            const serialized = token.serialize();
            expect(typeof serialized).toBe("string");
            expect(serialized).toBe(
                `{"@type":"TokenContentRelationshipTemplate","forIdentity":"${token.forIdentity!.serialize()}","passwordProtection":{"passwordType":"${token.passwordProtection!.passwordType}","salt":"${token.passwordProtection!.salt.toBase64URL()}"},"secretKey":${token.secretKey.serialize(false)},"templateId":"${token.templateId.toString()}"}`
            );
            const deserialized = Serializable.deserializeUnknown(serialized) as TokenContentRelationshipTemplate;
            expect(deserialized).toBeInstanceOf(Serializable);
            expect(deserialized).toBeInstanceOf(TokenContentRelationshipTemplate);
            expect(deserialized.secretKey).toBeInstanceOf(CryptoSecretKey);
            expect(deserialized.templateId).toBeInstanceOf(CoreId);
            expect(deserialized.forIdentity).toBeInstanceOf(CoreAddress);
            expect(deserialized.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
            expect(deserialized.secretKey.toBase64()).toStrictEqual(token.secretKey.toBase64());
            expect(deserialized.templateId.toString()).toStrictEqual(token.templateId.toString());
            expect(deserialized.forIdentity!.toString()).toStrictEqual(token.forIdentity!.toString());
            expect(deserialized.passwordProtection!.passwordType).toBe("pw");
            expect(deserialized.passwordProtection!.salt).toStrictEqual(token.passwordProtection!.salt);
        });

        test("should not create a tokenContent with too large passwordType", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordProtection: {
                        passwordType: "pin20",
                        salt: await CoreCrypto.random(16)
                    }
                });
            }).rejects.toThrow("SharedPasswordProtection.passwordType");
        });

        test("should not create a tokenContent with non-integer passwordType", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordProtection: {
                        passwordType: "pin2.4",
                        salt: await CoreCrypto.random(16)
                    }
                });
            }).rejects.toThrow("SharedPasswordProtection.passwordType");
        });

        test("should not create a tokenContent with passwordType starting with neither pw nor pin", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordProtection: {
                        passwordType: "pc" as any,
                        salt: await CoreCrypto.random(16)
                    }
                });
            }).rejects.toThrow("SharedPasswordProtection.passwordType");
        });

        test("should not create a tokenContent with a salt of wrong length", async function () {
            await expect(async () => {
                TokenContentRelationshipTemplate.from({
                    secretKey: await CryptoEncryption.generateKey(),
                    templateId: await CoreIdHelper.notPrefixed.generate(),
                    passwordProtection: {
                        passwordType: "pw",
                        salt: await CoreCrypto.random(8)
                    }
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
            await TestUtil.onboardDevice(transport, connection, deserialized.sharedSecret);
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
            await TestUtil.onboardDevice(transport, connection, deserialized.sharedSecret);
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
            await TestUtil.onboardDevice(transport, connection, deserialized.sharedSecret);
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
