import { AccountController } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import correlator from "correlation-id";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib/index.js";
import { RequestInterceptor } from "../lib/RequestInterceptor.js";

const uuidRegex = new RegExp("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

describe("CorrelationId", function () {
    let runtime: TestRuntimeServices;
    let runtimeServiceProvider: RuntimeServiceProvider;
    let interceptor: RequestInterceptor;

    beforeAll(async function () {
        runtimeServiceProvider = new RuntimeServiceProvider();
        runtime = (await runtimeServiceProvider.launch(1, { useCorrelator: true }))[0];

        const accountController = Container.get(AccountController);
        interceptor = new RequestInterceptor((accountController as any).synchronization.client);
    });

    afterAll(async function () {
        await runtimeServiceProvider.stop();
    });

    test("should send correlation id to the Backbone when given", async function () {
        interceptor.start();
        await correlator.withId("test-correlation-id", async () => {
            await runtime.transport.account.syncEverything();
        });

        const requests = interceptor.stop().requests;
        expect(requests.at(-1)!.headers!["x-correlation-id"]).toBe("test-correlation-id");
    });

    test("should send a generated correlation id to the Backbone", async function () {
        interceptor.start();

        await runtime.transport.account.syncEverything();

        const requests = interceptor.stop().requests;
        expect(requests.at(-1)!.headers!["x-correlation-id"]).toMatch(uuidRegex);
    });
});
