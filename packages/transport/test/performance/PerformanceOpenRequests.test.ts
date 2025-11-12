import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Relationship, Transport } from "@nmshd/transport";
import { TestUtil } from "../testHelpers/TestUtil.js";

describe("Performant Fetch of Open Requests", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let recipient: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);

        recipient = accounts[0];
    });

    afterAll(async function () {
        await recipient.close();
        await connection.close();
    });

    test("should query multiple times for open requests", async function () {
        const promises: Promise<Relationship[]>[] = [];
        for (let i = 0, l = 1000; i < l; i++) {
            promises.push(TestUtil.syncUntilHasRelationships(recipient));
        }
        await Promise.all(promises);
        for (let i = 0, l = promises.length; i < l; i++) {
            expect((await promises[i]).length).toBeDefined();
        }
    });
});
