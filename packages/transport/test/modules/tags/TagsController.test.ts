import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TagsController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let account: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];
    });

    afterAll(async function () {
        await account.close();

        await connection.close();
    });

    test("should receive the legal tags from the Backbone", async function () {
        const tags = await account.tags.getTags();

        expect(tags).toBeDefined();
    });
});
