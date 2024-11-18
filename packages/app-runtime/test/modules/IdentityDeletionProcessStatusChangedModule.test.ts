import { Serializable } from "@js-soft/ts-serval";
import { AppRuntime, DatawalletSynchronizedEvent, LocalAccountDTO, LocalAccountSession, RemoteNotificationEvent } from "../../src";
import { TestUtil } from "../lib";

describe("IdentityDeletionProcessStatusChangedTest", function () {
    let runtime: AppRuntime;

    let session: LocalAccountSession;
    let accounts: LocalAccountDTO[];

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        accounts = await TestUtil.provideAccounts(runtime, 1);

        session = await runtime.selectAccount(accounts[0].id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("bli bla blub", async function () {
        // await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const account = await runtime.accountServices.getAccount(accounts[0].id);

        expect(account.deletionDate).toBeUndefined();

        // await runtime.stop();
        // await runtime.start();
        // const account = await runtime.accountServices.getAccount(accounts[0].id);

        // expect(account.deletionDate).toBeDefined();

        // await session.transportServices.identityDeletionProcesses.cancelIdentityDeletionProcess();

        // expect(session.account.deletionDate).toBeUndefined();
    });

    test.only("multiDevice information", async function () {
        const runtimeDevice2 = await TestUtil.createRuntime();
        await runtimeDevice2.start();
        // const accountsDevice2 = TestUtil.provideAccounts(runtimeDevice2, 1);

        const newDevice = await session.transportServices.devices.createDevice({ name: "test", isAdmin: true });
        const token = await session.transportServices.devices.getDeviceOnboardingToken({ id: newDevice.value.id, profileName: "Test" });
        // const value = Serializable.fromUnknown(token.value.content)
        const content: any = Serializable.fromUnknown(token.value.content);

        const [device] = await runtimeDevice2.multiAccountController.onboardDevice(content.sharedSecret, "test");
        // const session2 = await runtimeDevice2.selectAccount(device.id.toString());

        // const account = await runtimeDevice2.accountServices.getAccount(accounts[0].id);

        await session.transportServices.identityDeletionProcesses.initiateIdentityDeletionProcess();

        runtimeDevice2.nativeEnvironment.eventBus.publish(
            new RemoteNotificationEvent({
                content: {
                    devicePushIdentifier: accounts[0].devicePushIdentifier,
                    eventName: "DatawalletModificationsCreated",
                    sentAt: new Date().toISOString(),
                    payload: {}
                }
            })
        );

        const event = await TestUtil.awaitEvent(runtimeDevice2, DatawalletSynchronizedEvent);

        expect(event).toBeDefined();
        const session2 = await runtimeDevice2.selectAccount(device.id.toString());

        // const account = await runtimeDevice2.accountServices.getAccount(accounts[0].id);
        console.log(session2);
    }, 120000);
});
