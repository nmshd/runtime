import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreCrypto, Token, TokenContentFile, TokenContentRelationshipTemplate, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TokenController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;

    function testTokens(sentToken: Token, receivedToken: Token, nowMinusSeconds: CoreDate) {
        expect(sentToken.id.toString()).toBe(receivedToken.id.toString());
        expect(sentToken.cache).toBeDefined();
        expect(sentToken.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentToken.cache?.content).toBeInstanceOf(Serializable);
        expect(sentToken.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(sentToken.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(sentToken.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedToken.cache).toBeDefined();
        expect(receivedToken.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedToken.cache?.content).toBeInstanceOf(Serializable);
        expect(receivedToken.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(receivedToken.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(receivedToken.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedToken.cache?.expiresAt.toISOString()).toBe(sentToken.cache?.expiresAt.toISOString());
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        sender = accounts[0];
        recipient = accounts[1];
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("should send and receive a TokenContent as String", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);
        tempId1 = sentToken.id;

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(Serializable);
        expect(receivedToken.cache?.content).toBeInstanceOf(JSONWrapper);
        expect((sentToken.cache?.content.toJSON() as any).content).toBe("TestToken");
        expect((receivedToken.cache?.content as any).content).toBe((sentToken.cache?.content as any).content);
    });

    test("should get the cached token", async function () {
        const sentToken = await sender.tokens.getToken(tempId1);
        const receivedToken = await recipient.tokens.getToken(tempId1);
        expect(sentToken).toBeDefined();
        expect(receivedToken).toBeDefined();
        testTokens(sentToken!, receivedToken!, tempDate);
    });

    test("should send and receive a TokenContentFile", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentFile.from({
            fileId: await CoreIdHelper.notPrefixed.generate(),
            secretKey: await CryptoEncryption.generateKey()
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);
        tempId2 = sentToken.id;

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentFile);
        const sentTokenContent = sentToken.cache?.content as TokenContentFile;
        expect(sentTokenContent.fileId).toBeInstanceOf(CoreId);
        expect(sentTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentFile);
        const receivedTokenContent = receivedToken.cache?.content as TokenContentFile;
        expect(receivedTokenContent.fileId).toBeInstanceOf(CoreId);
        expect(receivedTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(sentTokenContent.fileId.toString()).toBe(content.fileId.toString());
        expect(sentTokenContent.secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect(receivedTokenContent.fileId.toString()).toBe(sentTokenContent.fileId.toString());
        expect(receivedTokenContent.secretKey.toBase64()).toBe(sentTokenContent.secretKey.toBase64());
    });

    test("should send and receive a TokenContentRelationshipTemplate", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentRelationshipTemplate.from({
            templateId: await CoreIdHelper.notPrefixed.generate(),
            secretKey: await CryptoEncryption.generateKey()
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const sentTokenContent = sentToken.cache?.content as TokenContentRelationshipTemplate;
        expect(sentTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(sentTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const receivedTokenContent = receivedToken.cache?.content as TokenContentRelationshipTemplate;
        expect(receivedTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(receivedTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(sentTokenContent.templateId.toString()).toBe(content.templateId.toString());
        expect(sentTokenContent.secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect(receivedTokenContent.templateId.toString()).toBe(sentTokenContent.templateId.toString());
        expect(receivedTokenContent.secretKey.toBase64()).toBe(sentTokenContent.secretKey.toBase64());
    });

    test("should send and receive a personalized TokenContentRelationshipTemplate", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentRelationshipTemplate.from({
            templateId: await CoreIdHelper.notPrefixed.generate(),
            secretKey: await CryptoEncryption.generateKey(),
            forIdentity: recipient.identity.address
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const sentTokenContent = sentToken.cache?.content as TokenContentRelationshipTemplate;
        expect(sentTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(sentTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const receivedTokenContent = receivedToken.cache?.content as TokenContentRelationshipTemplate;
        expect(receivedTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(receivedTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(sentTokenContent.templateId.toString()).toBe(content.templateId.toString());
        expect(sentTokenContent.secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect(receivedTokenContent.templateId.toString()).toBe(sentTokenContent.templateId.toString());
        expect(receivedTokenContent.secretKey.toBase64()).toBe(sentTokenContent.secretKey.toBase64());
        expect(receivedTokenContent.forIdentity!.toString()).toBe(sentTokenContent.forIdentity!.toString());
    });

    test("should send and receive a password-protected TokenContentRelationshipTemplate", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentRelationshipTemplate.from({
            templateId: await CoreIdHelper.notPrefixed.generate(),
            secretKey: await CryptoEncryption.generateKey(),
            passwordProtection: {
                passwordType: "pw",
                salt: await CoreCrypto.random(16)
            }
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const sentTokenContent = sentToken.cache?.content as TokenContentRelationshipTemplate;
        expect(sentTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(sentTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(sentTokenContent.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(sentTokenContent.passwordProtection!.passwordType).toBe("pw");
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const receivedTokenContent = receivedToken.cache?.content as TokenContentRelationshipTemplate;
        expect(receivedTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(receivedTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedTokenContent.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(sentTokenContent.templateId.toString()).toBe(content.templateId.toString());
        expect(sentTokenContent.secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect(receivedTokenContent.templateId.toString()).toBe(sentTokenContent.templateId.toString());
        expect(receivedTokenContent.secretKey.toBase64()).toBe(sentTokenContent.secretKey.toBase64());
        expect(receivedTokenContent.passwordProtection!.passwordType).toBe(sentTokenContent.passwordProtection!.passwordType);
        expect(receivedTokenContent.passwordProtection!.salt.toBase64URL()).toBe(sentTokenContent.passwordProtection!.salt.toBase64URL());
    });

    test("should send and receive a password-protected and personalized TokenContentRelationshipTemplate", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentRelationshipTemplate.from({
            templateId: await CoreIdHelper.notPrefixed.generate(),
            secretKey: await CryptoEncryption.generateKey(),
            forIdentity: recipient.identity.address,
            passwordProtection: {
                passwordType: "pw",
                salt: await CoreCrypto.random(16)
            }
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const sentTokenContent = sentToken.cache?.content as TokenContentRelationshipTemplate;
        expect(sentTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(sentTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(sentTokenContent.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(sentTokenContent.passwordProtection!.passwordType).toBe("pw");
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        const receivedTokenContent = receivedToken.cache?.content as TokenContentRelationshipTemplate;
        expect(receivedTokenContent.templateId).toBeInstanceOf(CoreId);
        expect(receivedTokenContent.secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedTokenContent.passwordProtection!.salt).toBeInstanceOf(CoreBuffer);
        expect(sentTokenContent.templateId.toString()).toBe(content.templateId.toString());
        expect(sentTokenContent.secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect(receivedTokenContent.templateId.toString()).toBe(sentTokenContent.templateId.toString());
        expect(receivedTokenContent.secretKey.toBase64()).toBe(sentTokenContent.secretKey.toBase64());
        expect(sentTokenContent.forIdentity!.toString()).toBe(sentTokenContent.forIdentity!.toString());
        expect(receivedTokenContent.forIdentity!.toString()).toBe(sentTokenContent.forIdentity!.toString());
        expect(receivedTokenContent.passwordProtection!.passwordType).toBe(sentTokenContent.passwordProtection!.passwordType);
        expect(receivedTokenContent.passwordProtection!.salt.toBase64URL()).toBe(sentTokenContent.passwordProtection!.salt.toBase64URL());
    });

    test("should get the cached tokens", async function () {
        const sentTokens = await sender.tokens.getTokens();
        const receivedTokens = await recipient.tokens.getTokens();
        expect(sentTokens).toHaveLength(6);
        expect(receivedTokens).toHaveLength(6);
        expect(sentTokens[0].id.toString()).toBe(tempId1.toString());
        expect(sentTokens[1].id.toString()).toBe(tempId2.toString());
        testTokens(sentTokens[0], receivedTokens[0], tempDate);
        testTokens(sentTokens[1], receivedTokens[1], tempDate);
    });

    test("should send and receive a personalized Token", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: recipient.identity.address
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);
        tempId1 = sentToken.id;

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(Serializable);
        expect(sentToken.cache?.forIdentity).toBe(recipient.identity.address);
        expect(receivedToken.cache?.content).toBeInstanceOf(JSONWrapper);
        expect((sentToken.cache?.content.toJSON() as any).content).toBe("TestToken");
        expect((receivedToken.cache?.content as any).content).toBe((sentToken.cache?.content as any).content);
        expect(receivedToken.cache?.forIdentity?.toString()).toBe(recipient.identity.address.toString());
    });

    test("should throw if a personalized token is not loaded by the right identity", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: sender.identity.address
        });

        await expect(async () => {
            await recipient.tokens.loadPeerTokenByReference(sentToken.toTokenReference(sender.config.baseUrl), true);
        }).rejects.toThrow("transport.general.notIntendedForYou");
    });

    test("should throw if a personalized token is not loaded by the right identity and it's uncaught before reaching the Backbone", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: sender.identity.address
        });

        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        reference.forIdentityTruncated = undefined;
        const truncatedReference = reference;

        await expect(async () => {
            await recipient.tokens.loadPeerTokenByReference(truncatedReference, true);
        }).rejects.toThrow("error.platform.recordNotFound");
    });

    test("should create and load a password-protected token", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            passwordProtection: { password: "password", passwordType: "pw" }
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);
        const receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false, "password");
        tempId1 = sentToken.id;

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(Serializable);
        expect(sentToken.passwordProtection!.password).toBe("password");
        expect(sentToken.passwordProtection!.salt).toBeDefined();
        expect(sentToken.passwordProtection!.salt).toHaveLength(16);
        expect(sentToken.passwordProtection!.passwordType).toBe("pw");

        expect(reference.passwordProtection!.passwordType).toBe("pw");
        expect(reference.passwordProtection!.salt).toStrictEqual(sentToken.passwordProtection!.salt);

        expect(receivedToken.cache?.content).toBeInstanceOf(JSONWrapper);
        expect((receivedToken.cache?.content as any).content).toBe((sentToken.cache?.content as any).content);
        expect(receivedToken.passwordProtection!.password).toBe("password");
        expect(receivedToken.passwordProtection!.salt).toStrictEqual(sentToken.passwordProtection!.salt);
        expect(receivedToken.passwordProtection!.passwordType).toBe("pw");
    });

    test("should throw an error if loaded with a wrong or missing password", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            passwordProtection: { password: "password", passwordType: "pw" }
        });
        const reference = sentToken.toTokenReference(sender.config.baseUrl);

        await expect(recipient.tokens.loadPeerTokenByReference(reference, true, "wrongPassword")).rejects.toThrow("error.platform.recordNotFound");
        await expect(recipient.tokens.loadPeerTokenByReference(reference, true)).rejects.toThrow("error.transport.noPasswordProvided");
    });

    test("should fetch multiple password-protected tokens", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken1 = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            passwordProtection: { password: "password", passwordType: "pw" }
        });
        const reference1 = sentToken1.toTokenReference(sender.config.baseUrl);

        const sentToken2 = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            passwordProtection: { password: "1234", passwordType: "pin4" }
        });
        const reference2 = sentToken2.toTokenReference(sender.config.baseUrl);

        const receivedToken1 = await recipient.tokens.loadPeerTokenByReference(reference1, false, "password");
        const receivedToken2 = await recipient.tokens.loadPeerTokenByReference(reference2, false, "1234");
        const fetchCachesResult = await recipient.tokens.fetchCaches([receivedToken1.id, receivedToken2.id]);
        expect(fetchCachesResult).toHaveLength(2);
    });

    describe("Token deletion", function () {
        let sentToken: Token;
        let receivedToken: Token;

        beforeEach(async function () {
            const expiresAt = CoreDate.utc().add({ minutes: 5 });
            const content = Serializable.fromAny({ content: "TestToken" });
            sentToken = await sender.tokens.sendToken({
                content,
                expiresAt,
                ephemeral: false
            });

            const reference = sentToken.toTokenReference(sender.config.baseUrl);
            receivedToken = await recipient.tokens.loadPeerTokenByReference(reference, false);
        });

        test("should delete own token locally and from the Backbone", async function () {
            await sender.tokens.delete(sentToken);
            const tokenOnBackbone = await recipient.tokens.fetchCaches([sentToken.id]);
            expect(tokenOnBackbone).toHaveLength(0);

            const localToken = await sender.tokens.getToken(sentToken.id);
            expect(localToken).toBeUndefined();
        });

        test("should delete a peer owned token only locally", async function () {
            await recipient.tokens.delete(receivedToken);
            const tokenOnBackbone = await sender.tokens.fetchCaches([sentToken.id]);
            expect(tokenOnBackbone).toHaveLength(1);

            const localToken = await recipient.tokens.getToken(sentToken.id);
            expect(localToken).toBeUndefined();
        });

        test("should delete a token during decomposition", async function () {
            await recipient.tokens.cleanupTokensOfDecomposedRelationship(sender.identity.address);
            const token = await recipient.tokens.getToken(sentToken.id);
            expect(token).toBeUndefined();
        });
    });
});
