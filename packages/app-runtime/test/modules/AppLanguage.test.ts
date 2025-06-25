import { LanguageISO639 } from "@nmshd/core-types";
import { DeviceAuthClient } from "@nmshd/transport";
import { AppLanguageChangedEvent, AppRuntime, LocalAccountSession } from "../../src";
import { MockEventBus, TestUtil } from "../lib";
import { MockLanguageProvider } from "../lib/MockLanguageProvider";

describe("PushNotificationModuleTest", function () {
    const eventBus = new MockEventBus();

    let runtime: AppRuntime;
    let session: LocalAccountSession;
    let devicesClient: DeviceAuthClient;

    const languageProvider = new MockLanguageProvider();

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime({ pushService: "dummy", modules: { pushNotification: { enabled: true } } }, undefined, eventBus, languageProvider);
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 1);
        session = await runtime.selectAccount(accounts[0].id);
        devicesClient = session.accountController.devices["client"] as DeviceAuthClient;
    });

    afterAll(async function () {
        await runtime.stop();
    });

    afterEach(() => eventBus.reset());

    test("should persist push identifier", async function () {
        runtime.eventBus.publish(new AppLanguageChangedEvent("de" as any));
        await eventBus.waitForRunningEventHandlers();
        let device = await devicesClient.getCurrentDevice();
        expect(device.value.communicationLanguage).toBe(LanguageISO639.de);

        runtime.eventBus.publish(new AppLanguageChangedEvent(LanguageISO639.sl));
        await eventBus.waitForRunningEventHandlers();
        device = await devicesClient.getCurrentDevice();
        expect(device.value.communicationLanguage).toBe(LanguageISO639.sl);
    });

    test("should update language for local account", async function () {
        languageProvider.language = LanguageISO639.es;

        await runtime.selectAccount(session.account.id);
        await eventBus.waitForRunningEventHandlers();

        const device = await devicesClient.getCurrentDevice();
        expect(device.value.communicationLanguage).toBe(LanguageISO639.es);
    });
});
