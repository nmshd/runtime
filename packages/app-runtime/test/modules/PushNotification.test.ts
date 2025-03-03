import { DatawalletSynchronizedEvent } from "@nmshd/runtime";
import { AppRuntime, ExternalEventReceivedEvent, LocalAccountSession, RemoteNotificationEvent, RemoteNotificationRegistrationEvent } from "../../src";
import { MockEventBus, TestUtil } from "../lib";

describe("PushNotificationModuleTest", function () {
    const eventBus = new MockEventBus();

    let runtime: AppRuntime;
    let session: LocalAccountSession;
    let devicePushIdentifier = "dummy value";

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime({ pushService: "dummy", modules: { pushNotification: { enabled: true } } }, undefined, eventBus);
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 1);
        session = await runtime.selectAccount(accounts[0].id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    afterEach(() => eventBus.reset());

    test("should persist push identifier", async function () {
        runtime.eventBus.publish(new RemoteNotificationRegistrationEvent("handleLongerThan10Characters"));

        await eventBus.waitForRunningEventHandlers();

        const account = await runtime.accountServices.getAccount(session.account.id);
        expect(account.devicePushIdentifier).toBeDefined();

        devicePushIdentifier = account.devicePushIdentifier!;
    });

    test("should do a datawallet sync when DatawalletModificationsCreated is received", async function () {
        runtime.eventBus.publish(
            new RemoteNotificationEvent({
                content: {
                    devicePushIdentifier: devicePushIdentifier,
                    eventName: "DatawalletModificationsCreated",
                    sentAt: new Date().toISOString(),
                    payload: {}
                }
            })
        );

        await expect(eventBus).toHavePublished(DatawalletSynchronizedEvent);
    });

    test("should do a sync everything when ExternalEventCreated is received", async function () {
        runtime.eventBus.publish(
            new RemoteNotificationEvent({
                content: {
                    devicePushIdentifier: devicePushIdentifier,
                    eventName: "ExternalEventCreated",
                    sentAt: new Date().toISOString(),
                    payload: {}
                }
            })
        );

        await expect(eventBus).toHavePublished(ExternalEventReceivedEvent);
    });
});
