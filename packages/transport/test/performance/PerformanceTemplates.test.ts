import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, Transport } from "@nmshd/transport";
import { TestUtil } from "../testHelpers/TestUtil.js";

async function createTemplate(from: AccountController) {
    const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
        content: {
            mycontent: "template"
        },
        expiresAt: CoreDate.utc().add({ hours: 12 }),
        maxNumberOfAllocations: 1
    });
    return templateFrom;
}

describe("Performant Creation of Templates", function () {
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

    test("should create multiple concurrent relationship templates for an account", async function () {
        const promises: Promise<RelationshipTemplate>[] = [];
        for (let i = 0, l = 100; i < l; i++) {
            promises.push(createTemplate(recipient));
        }
        await Promise.all(promises);
        for (let i = 0, l = promises.length; i < l; i++) {
            expect((await promises[i]).id).toBeDefined();
        }
    });
});
