import { MessageReceivedEvent } from "@nmshd/runtime";
import { AppRuntime, LocalAccountSession } from "../../src";
import { MockEventBus, TestUtil } from "../lib";

// eslint-disable-next-line jest/no-disabled-tests -- disabled because the backbone currently isn't performant enough in the CI
describe.skip("SSEModuleTest", function () {
    const eventBus = new MockEventBus();

    let runtime: AppRuntime;
    let session1: LocalAccountSession;
    let session2: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime({ modules: { sse: { enabled: true, baseUrlOverride: process.env.NMSHD_TEST_BASEURL_SSE_SERVER } } }, undefined, eventBus);
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 2);
        session1 = await runtime.selectAccount(accounts[0].id);
        session2 = await runtime.selectAccount(accounts[1].id);

        await TestUtil.addRelationship(session1, session2);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    afterEach(() => eventBus.reset());

    test("should auto sync when new external events arrive", async function () {
        const message = await TestUtil.sendMessage(session1, session2);

        const received = await eventBus.waitForEvent(MessageReceivedEvent, (e) => e.eventTargetAddress === session2.account.address!, 20000);

        expect(received.data.id).toBe(message.id);
    });
});
