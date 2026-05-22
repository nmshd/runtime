import type { AppRuntime, LocalAccountSession } from "../../src";
import { MockEventBus } from "../lib/MockEventBus";

// eslint-disable-next-line jest/no-disabled-tests -- disabled because the Backbone currently isn't performant enough in the CI
describe.skip("SSEModuleTest", function () {
    const eventBus = new MockEventBus();
    // Note: even when skipped, Jest executes top-level imports.
    // Keep runtime-heavy imports lazy to avoid teardown-time libsodium init errors.
    let testUtil: typeof import("../lib/TestUtil").TestUtil;

    let runtime: AppRuntime;
    let session1: LocalAccountSession;
    let session2: LocalAccountSession;

    beforeAll(async function () {
        ({ TestUtil: testUtil } = await import("../lib/TestUtil"));

        runtime = await testUtil.createRuntime({ modules: { sse: { enabled: true, baseUrlOverride: process.env.NMSHD_TEST_BASEURL_SSE_SERVER } } }, undefined, eventBus);
        await runtime.start();

        const accounts = await testUtil.provideAccounts(runtime, 2);
        session1 = await runtime.selectAccount(accounts[0].id);
        session2 = await runtime.selectAccount(accounts[1].id);

        await testUtil.addRelationship(session1, session2);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    afterEach(() => eventBus.reset());

    test("should auto sync when new external events arrive", async function () {
        const { MessageReceivedEvent: messageReceivedEvent } = await import("@nmshd/runtime");

        const message = await testUtil.sendMessage(session1, session2);

        const received = await eventBus.waitForEvent(messageReceivedEvent, (e) => e.eventTargetAddress === session2.account.address!, 20000);

        expect(received.data.id).toBe(message.id);
    });
});
