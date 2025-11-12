import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { AccountController, Transport, TransportController } from "@nmshd/transport";
import { mock } from "ts-mockito";
import { RequestInterceptor } from "../../testHelpers/RequestInterceptor.js";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("AuthenticationTest", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let oldGetCredentials: Function;
    let oldBaseUrl: string;
    let oldLogger: ILogger;
    let testAccount: AccountController;
    let interceptor: RequestInterceptor;

    function startWrongAuth(controller: TransportController, config: any = {}) {
        const anyC = controller as any;
        oldLogger = anyC.client._logger;
        anyC.client._logger = mock<ILogger>();
        oldGetCredentials = controller.parent.activeDevice.getCredentials as Function;
        controller.parent.activeDevice.getCredentials = async function () {
            const deviceCredentials = await oldGetCredentials.apply(anyC.parent.activeDevice);
            const newCredentials = Object.assign({}, deviceCredentials, config);
            return newCredentials;
        };

        if (config.baseUrl) {
            const authenticator = controller.parent.authenticator;
            oldBaseUrl = authenticator["authClient"]["axiosInstance"].defaults.baseURL!;
            authenticator["authClient"]["axiosInstance"].defaults.baseURL = config.baseUrl;
        }
    }

    function stopWrongAuth(controller: TransportController) {
        const anyC = controller as any;
        anyC.parent.activeDevice.getCredentials = oldGetCredentials;
        if (oldBaseUrl) {
            controller.parent.authenticator["authClient"]["axiosInstance"].defaults.baseURL = oldBaseUrl;
            oldBaseUrl = "";
        }
        anyC.client._logger = oldLogger;
    }

    function setAuthTokenToExpired(controller: AccountController) {
        const anyAuthenticator = controller.authenticator as any;
        anyAuthenticator.expiry = CoreDate.utc().subtract({ seconds: 1 });
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        testAccount = accounts[0];
        interceptor = new RequestInterceptor((testAccount.authenticator as any).authClient);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    test("should only authenticate once", async function () {
        interceptor.start();
        setAuthTokenToExpired(testAccount);
        // First Request = Auth
        await testAccount.syncEverything();
        await testAccount.syncEverything();
        await testAccount.syncEverything();
        await testAccount.syncEverything();
        const results = interceptor.stop();
        const requests = results.requests;
        expect(requests).toHaveLength(1);

        expect(requests[0].method).toBe("post");
        expect(requests[0].url).toMatch(/^\/connect\/token/);
    });

    test("should only authenticate again if token is expired", async function () {
        interceptor.start();
        await testAccount.syncEverything();
        await testAccount.syncEverything();

        setAuthTokenToExpired(testAccount);
        // Third Request => Auth as it is expired now

        await testAccount.syncEverything();
        await testAccount.syncEverything();

        const results = interceptor.stop();
        const requests = results.requests;
        expect(requests).toHaveLength(1);

        expect(requests[0].method).toBe("post");
        expect(requests[0].url).toMatch(/^\/connect\/token/);
    });

    test("should throw correct error on authentication issues", async function () {
        setAuthTokenToExpired(testAccount);

        startWrongAuth(testAccount.messages, { password: "thisIsAnIntentionallyWrongPassword" });

        await TestUtil.expectThrowsRequestErrorAsync(testAccount.syncEverything(), "error.transport.request.noAuthGrant", 400);
        stopWrongAuth(testAccount.messages);
    });

    test("should throw correct error on network issues", async function () {
        startWrongAuth(testAccount.messages, { baseUrl: "bad-protocol://localhost/" });
        await TestUtil.expectThrowsRequestErrorAsync(testAccount.syncEverything(), "error.transport.request.noAuthPossible", 500);
        stopWrongAuth(testAccount.messages);
    });
});
