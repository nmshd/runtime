import { RemoteNotificationEvent, RemoteNotificationRegistrationEvent } from "@js-soft/native-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { AppRuntime, DatawalletSynchronizedEvent, ExternalEventReceivedEvent, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

describe("PushNotificationModuleTest", function () {
    let runtime: AppRuntime;
    let session: LocalAccountSession;
    let devicePushIdentifier = "dummy value";

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 1);
        session = await runtime.selectAccount(accounts[0].id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should persist push identifier", async function () {
        runtime.nativeEnvironment.eventBus.publish(new RemoteNotificationRegistrationEvent("handleLongerThan10Characters"));

        // wait for the registration to finish
        // there is no event to wait for, so we just wait for a second
        await sleep(1000);

        const account = await runtime.accountServices.getAccount(session.account.id);
        expect(account.devicePushIdentifier).toBeDefined();

        devicePushIdentifier = account.devicePushIdentifier!;
    });

    test("should do a datawallet sync when DatawalletModificationsCreated is received", async function () {
        runtime.nativeEnvironment.eventBus.publish(
            new RemoteNotificationEvent({
                content: {
                    devicePushIdentifier: devicePushIdentifier,
                    eventName: "DatawalletModificationsCreated",
                    sentAt: new Date().toISOString(),
                    payload: {}
                }
            })
        );

        const event = await TestUtil.awaitEvent(runtime, DatawalletSynchronizedEvent);
        expect(event).toBeDefined();
    });

    test("should do a sync everything when ExternalEventCreated is received", async function () {
        runtime.nativeEnvironment.eventBus.publish(
            new RemoteNotificationEvent({
                content: {
                    devicePushIdentifier: devicePushIdentifier,
                    eventName: "ExternalEventCreated",
                    sentAt: new Date().toISOString(),
                    payload: {}
                }
            })
        );

        const event = await TestUtil.awaitEvent(runtime, ExternalEventReceivedEvent);
        expect(event).toBeDefined();
    });
});
