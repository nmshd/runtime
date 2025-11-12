import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { FakeSyncClient } from "../../testHelpers/FakeSyncClient";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("SyncController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let sender: AccountController | undefined;
    let recipient: AccountController | undefined;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport({ datawalletEnabled: true });

        await transport.init();
    });

    afterAll(async function () {
        await sender?.close();
        await recipient?.close();

        await connection.close();
    });

    test("creating a new identity sets the identityDatawalletVersion to the supportedDatawalletVersion", async function () {
        const syncClient = new FakeSyncClient();

        const account = await TestUtil.createAccount(transport, connection, { syncClient });

        expect(syncClient.finalizeDatawalletVersionUpgradeRequest).toBeDefined();
        expect(syncClient.finalizeDatawalletVersionUpgradeRequest!.newDatawalletVersion).toStrictEqual(account.config.supportedDatawalletVersion);
    });

    test("all datawallet modifications are created with the configured supportedDatawalletVersion", async function () {
        const syncClient = new FakeSyncClient();

        const account = await TestUtil.createAccount(transport, connection, { syncClient });

        await account.tokens.sendToken({
            content: { someProperty: "someValue" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            ephemeral: false
        });

        await account.syncDatawallet();

        expect(syncClient.createDatawalletModificationsRequest).toBeDefined();
        expect(syncClient.createDatawalletModificationsRequest!.modifications.length).toBeGreaterThan(0);
        for (const modification of syncClient.createDatawalletModificationsRequest!.modifications) {
            expect(modification.datawalletVersion).toStrictEqual(account.config.supportedDatawalletVersion);
        }
    });

    test("syncDatawallet upgrades identityDatawalletVersion to supportedDatawalletVersion", async function () {
        const syncClient = new FakeSyncClient();

        const account = await TestUtil.createAccount(transport, connection, { syncClient });

        TestUtil.defineMigrationToVersion(2, account);

        account.config.supportedDatawalletVersion = 2;

        await account.syncDatawallet();

        expect(syncClient.startSyncRunRequest).toBeDefined();
        expect(syncClient.finalizeDatawalletVersionUpgradeRequest).toBeDefined();
        expect(syncClient.finalizeDatawalletVersionUpgradeRequest!.newDatawalletVersion).toBe(2);
    });

    test("sync should return existing promise when called twice", async function () {
        const [sender, recipient] = await TestUtil.provideAccounts(transport, connection, 2);
        await TestUtil.addRelationship(sender, recipient);

        await TestUtil.sendMessage(sender, recipient);

        await sleep(200);

        const results = await Promise.all([recipient.syncEverything(), recipient.syncEverything(), recipient.syncEverything()]);

        expect(results[0].messages).toHaveLength(1);
        expect(results[1].messages).toHaveLength(1);
        expect(results[2].messages).toHaveLength(1);

        const messages = await recipient.messages.getMessages();
        expect(messages).toHaveLength(1);
    });
});
