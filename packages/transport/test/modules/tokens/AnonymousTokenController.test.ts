import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, AnonymousTokenController, Token, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("AnonymousTokenController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let anonymousTokenController: AnonymousTokenController;

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

        const accounts = await TestUtil.provideAccounts(transport, 1);
        sender = accounts[0];

        anonymousTokenController = new AnonymousTokenController(transport.config);
    });

    afterAll(async function () {
        await sender.close();
        await connection.close();
    });

    test("should load a non-personalized token", async function () {
        const tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false
        });
        const reference = sentToken.toTokenReference().truncate();
        const receivedToken = await anonymousTokenController.loadPeerTokenByTruncated(reference);

        testTokens(sentToken, receivedToken, tempDate);
        expect(sentToken.cache?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
        expect(sentToken.cache?.content).toBeInstanceOf(Serializable);
        expect(receivedToken.cache?.content).toBeInstanceOf(JSONWrapper);
        expect((sentToken.cache?.content.toJSON() as any).content).toBe("TestToken");
        expect((receivedToken.cache?.content as any).content).toBe((sentToken.cache?.content as any).content);
    });

    test("should throw when loading a personalized token", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: sender.identity.address
        });

        await expect(anonymousTokenController.loadPeerTokenByTruncated(sentToken.toTokenReference().truncate())).rejects.toThrow("transport.general.notIntendedForYou");
    });

    test("should throw when loading a personalized token and it's uncaught before reaching the backbone", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: sender.identity.address
        });

        const reference = sentToken.toTokenReference();
        reference.forIdentityTruncated = undefined;
        const truncatedReference = reference.truncate();

        await expect(anonymousTokenController.loadPeerTokenByTruncated(truncatedReference)).rejects.toThrow("error.platform.recordNotFound");
    });
});