import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CryptoEncryption, CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreDate, CoreId, Token, TokenContentFile, TokenContentRelationshipTemplate, Transport } from "../../../src";
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
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
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
        const reference = sentToken.toTokenReference().truncate();
        const receivedToken = await recipient.tokens.loadPeerTokenByTruncated(reference, false);
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
            fileId: await CoreId.generate(),
            secretKey: await CryptoEncryption.generateKey()
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference().truncate();
        const receivedToken = await recipient.tokens.loadPeerTokenByTruncated(reference, false);
        tempId2 = sentToken.id;

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentFile);
        expect((sentToken.cache?.content as TokenContentFile).fileId).toBeInstanceOf(CoreId);
        expect((sentToken.cache?.content as TokenContentFile).secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentFile);
        expect((receivedToken.cache?.content as TokenContentFile).fileId).toBeInstanceOf(CoreId);
        expect((receivedToken.cache?.content as TokenContentFile).secretKey).toBeInstanceOf(CryptoSecretKey);
        expect((sentToken.cache?.content as TokenContentFile).fileId.toString()).toBe(content.fileId.toString());
        expect((sentToken.cache?.content as TokenContentFile).secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect((receivedToken.cache?.content as TokenContentFile).fileId.toString()).toBe((sentToken.cache?.content as TokenContentFile).fileId.toString());
        expect((receivedToken.cache?.content as TokenContentFile).secretKey.toBase64()).toBe((sentToken.cache?.content as TokenContentFile).secretKey.toBase64());
    });

    test("should send and receive a TokenContentRelationshipTemplate", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = TokenContentRelationshipTemplate.from({
            templateId: await CoreId.generate(),
            secretKey: await CryptoEncryption.generateKey()
        });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference().truncate();
        const receivedToken = await recipient.tokens.loadPeerTokenByTruncated(reference, false);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        expect((sentToken.cache?.content as TokenContentRelationshipTemplate).templateId).toBeInstanceOf(CoreId);
        expect((sentToken.cache?.content as TokenContentRelationshipTemplate).secretKey).toBeInstanceOf(CryptoSecretKey);
        expect(receivedToken.cache?.content).toBeInstanceOf(TokenContentRelationshipTemplate);
        expect((receivedToken.cache?.content as TokenContentRelationshipTemplate).templateId).toBeInstanceOf(CoreId);
        expect((receivedToken.cache?.content as TokenContentRelationshipTemplate).secretKey).toBeInstanceOf(CryptoSecretKey);
        expect((sentToken.cache?.content as TokenContentRelationshipTemplate).templateId.toString()).toBe(content.templateId.toString());
        expect((sentToken.cache?.content as TokenContentRelationshipTemplate).secretKey.toBase64()).toBe(content.secretKey.toBase64());
        expect((receivedToken.cache?.content as TokenContentRelationshipTemplate).templateId.toString()).toBe(
            (sentToken.cache?.content as TokenContentRelationshipTemplate).templateId.toString()
        );
        expect((receivedToken.cache?.content as TokenContentRelationshipTemplate).secretKey.toBase64()).toBe(
            (sentToken.cache?.content as TokenContentRelationshipTemplate).secretKey.toBase64()
        );
    });

    test("should get the cached tokens", async function () {
        const sentTokens = await sender.tokens.getTokens();
        const receivedTokens = await recipient.tokens.getTokens();
        expect(sentTokens).toHaveLength(3);
        expect(receivedTokens).toHaveLength(3);
        expect(sentTokens[0].id.toString()).toBe(tempId1.toString());
        expect(sentTokens[1].id.toString()).toBe(tempId2.toString());
        testTokens(sentTokens[0], receivedTokens[0], tempDate);
        testTokens(sentTokens[1], receivedTokens[1], tempDate);
    });
});
