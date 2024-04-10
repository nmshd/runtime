import { Realm } from "@nmshd/transport";
import { AppRuntime, LocalAccountDTO } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("Runtime Startup", function () {
    let runtime: AppRuntime;

    let eventListener: EventListener;
    let events: any[];
    let i = 0;
    let localAccount: LocalAccountDTO;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntimeWithoutInit();

        eventListener = new EventListener(runtime, [
            "runtime.initializing",
            "transport.initializing",
            "transport.initialized",
            "runtime.modulesLoaded",
            "runtime.modulesInitialized",
            "runtime.modulesStarted",
            "runtime.initialized"
        ]);
        eventListener.start();
        await runtime.init();
        await runtime.start();
        eventListener.stop();
        events = eventListener.getReceivedEvents();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should fire event when initializing runtime", () => {
        expect(events[i++].namespace).toBe("runtime.initializing");
    });

    test("should fire event when loading modules", function () {
        expect(events[i++].namespace).toBe("runtime.modulesLoaded");
    });

    test("should fire event after loading modules", function () {
        expect(events[i++].namespace).toBe("runtime.modulesInitialized");
    });

    test("should fire event after initializing runtime", function () {
        expect(events[i++].namespace).toBe("runtime.initialized");
    });

    test("should fire event after starting modules", function () {
        expect(events[i++].namespace).toBe("runtime.modulesStarted");
    });

    test("should create an account", async function () {
        localAccount = await runtime.accountServices.createAccount(Realm.Prod, "Profil 1");

        expect(localAccount).toBeDefined();
    });

    test("should login to created account", async function () {
        const selectedAccount = await runtime.selectAccount(localAccount.id);
        expect(selectedAccount).toBeDefined();
        expect(selectedAccount.account.id.toString()).toBe(localAccount.id.toString());
    });
});
