import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import correlationIdLib from "correlation-id";
import { AccountController } from "../../../src";
import { RequestInterceptor } from "../../testHelpers/RequestInterceptor";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("CorrelationId", function () {
    let connection: IDatabaseConnection;
    let testAccount: AccountController;
    let interceptor: RequestInterceptor;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        const transport = TestUtil.createTransport(connection);
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 1);
        testAccount = accounts[0];
        interceptor = new RequestInterceptor((testAccount as any).synchronization.client);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    test("should send correlation id to the backbone when given", async function () {
        interceptor.start();
        await correlationIdLib.withId("test-correlation-id", async () => {
            await testAccount.syncEverything();
        });

        const requests = interceptor.stop().requests;
        expect(requests.at(-1)!.headers!["x-correlation-id"]).toBe("test-correlation-id");
    });
});
