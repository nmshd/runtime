import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, AnonymousTokenController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("AnonymousTokenController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let anonymousTokenController: AnonymousTokenController;

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

    test("should throw when loading a personalized token", async function () {
        const expiresAt = CoreDate.utc().add({ minutes: 5 });
        const content = Serializable.fromAny({ content: "TestToken" });
        const sentToken = await sender.tokens.sendToken({
            content,
            expiresAt,
            ephemeral: false,
            forIdentity: sender.identity.address
        });

        await TestUtil.expectThrowsAsync(async () => {
            await anonymousTokenController.loadPeerToken(sentToken.id, sentToken.secretKey, sender.identity.address);
        }, "transport.general.notIntendedForYou");
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

        await TestUtil.expectThrowsAsync(async () => {
            await anonymousTokenController.loadPeerToken(sentToken.id, sentToken.secretKey);
        }, "error.platform.recordNotFound");
    });
});
