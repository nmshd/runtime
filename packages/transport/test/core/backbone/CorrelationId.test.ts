import correlationIdLib from "correlation-id";
import { RequestInterceptor } from "../../testHelpers/RequestInterceptor";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("CorrelationId", function () {
    test("should send correlation id to the backend when given", async function () {
        // Arrange
        const connection = await TestUtil.createDatabaseConnection();
        const transport = TestUtil.createTransport(connection);
        await transport.init();
        const accounts = await TestUtil.provideAccounts(transport, 1);
        const testAccount = accounts[0];
        const interceptor = new RequestInterceptor((testAccount as any).synchronization.client);

        // Act
        interceptor.start();
        await correlationIdLib.withId("test-correlation-id", async () => {
            await testAccount.syncEverything();
        });

        // Assert
        const requests = interceptor.stop().requests;
        expect(requests.at(-1)!.headers!["x-correlation-id"]).toBe("test-correlation-id");

        // Cleanup
        await testAccount.close();
        await connection.close();
    });
});
