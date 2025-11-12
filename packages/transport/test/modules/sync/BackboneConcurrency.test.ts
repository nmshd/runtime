import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { AccountController, CreateDatawalletModificationsRequestItem, StartSyncRunStatus, SyncClient, SyncRunType } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("BackboneConcurrency", function () {
    let connection: IDatabaseConnection;

    beforeAll(async () => {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("should not allow pushing datawallet modifications during active sync run", async function () {
        const a1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });
        const { device1: b1, device2: b2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });
        const syncClientB1 = createSyncClient(b1);
        const syncClientB2 = createSyncClient(b2);

        await TestUtil.addRelationship(a1, b1);
        await TestUtil.sendMessage(a1, b1);

        await sleep(2000);

        const localIndex = await (b1 as any).synchronization.getLocalDatawalletModificationIndex();

        await syncClientB1.startSyncRun({ type: SyncRunType.ExternalEventSync });
        const resultOfCreate = await syncClientB2.createDatawalletModifications({
            modifications: [new CreateDatawalletModificationsRequestItemBuilder().build()],
            localIndex
        });

        expect(resultOfCreate.isError).toBe(true);
        expect(resultOfCreate.error.code).toBe("error.platform.validation.datawallet.cannotPushDatawalletModificationsDuringActiveSyncRun");
    });

    // eslint-disable-next-line jest/no-disabled-tests
    test.skip("should only start one sync run on multiple calls", async function () {
        const a1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const numberOfDevices = 10;
        const b = await TestUtil.createIdentityWithNDevices(numberOfDevices, connection, { datawalletEnabled: true });
        const b1 = b[0];

        await TestUtil.addRelationship(a1, b1);
        await TestUtil.sendMessage(a1, b1);

        await sleep(3000);

        const startSyncRunPromises = b.map((bn) =>
            createSyncClient(bn).startSyncRun({
                type: SyncRunType.ExternalEventSync
            })
        );

        const startSyncRunResults = await Promise.all(startSyncRunPromises);

        const successResults = startSyncRunResults.filter((r) => r.isSuccess && r.value.status === StartSyncRunStatus.Created);
        const noNewEventsResults = startSyncRunResults.filter((r) => r.isSuccess && r.value.status === StartSyncRunStatus.NoNewEvents);
        const errorResults = startSyncRunResults.filter((r) => r.isError);

        expect(successResults).toHaveLength(1);
        expect(errorResults).toHaveLength(numberOfDevices - successResults.length - noNewEventsResults.length);

        const code = "error.platform.validation.syncRun.cannotStartSyncRunWhenAnotherSyncRunIsRunning";
        for (const result of errorResults) {
            expect(result.error.code).toStrictEqual(code);
        }
    });
});

class CreateDatawalletModificationsRequestItemBuilder {
    private readonly collection = "aCollection";
    private readonly objectIdentifier = "anIdentifier";
    private readonly type = "Create";
    private readonly encryptedPayload = "AAAA";
    private readonly payloadCategory = "technicalData";

    public build(): CreateDatawalletModificationsRequestItem {
        return {
            collection: this.collection,
            objectIdentifier: this.objectIdentifier,
            type: this.type,
            encryptedPayload: this.encryptedPayload,
            payloadCategory: this.payloadCategory,
            datawalletVersion: 1
        };
    }
}

function createSyncClient(accountController: AccountController) {
    return new TestableSyncClient(accountController);
}

class TestableSyncClient extends SyncClient {
    public constructor(accountController: AccountController) {
        super(accountController.config, accountController.authenticator);
    }

    public async getAllExternalEventsOfSyncRun(id: string) {
        return await (await this.getExternalEventsOfSyncRun(id)).value.collect();
    }
}
