import { ArbitraryRelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { PeerRelationshipTemplateLoadedEvent } from "@nmshd/runtime";
import assert from "assert";
import { AppRuntime, LocalAccountSession } from "../../src";
import { MockEventBus, MockUIBridge, TestUtil } from "../lib";

describe("AppStringProcessor", function () {
    const mockUiBridge = new MockUIBridge();
    const eventBus = new MockEventBus();

    let runtime1: AppRuntime;
    let runtime1Session: LocalAccountSession;

    let runtime2: AppRuntime;

    let runtime2SessionA: LocalAccountSession;

    const templateContent: ArbitraryRelationshipTemplateContentJSON = { "@type": "ArbitraryRelationshipTemplateContent", value: "value" };

    beforeAll(async function () {
        runtime1 = await TestUtil.createRuntime();
        await runtime1.start();

        const account = await runtime1.accountServices.createAccount(Math.random().toString(36).substring(7));
        runtime1Session = await runtime1.selectAccount(account.id);

        runtime2 = await TestUtil.createRuntime(undefined, mockUiBridge, eventBus);
        await runtime2.start();

        const accounts = await TestUtil.provideAccounts(runtime2, 2);
        runtime2SessionA = await runtime2.selectAccount(accounts[0].id);
        await runtime2.selectAccount(accounts[1].id);
    });

    afterAll(async function () {
        await runtime1.stop();
        await runtime2.stop();
    });

    afterEach(function () {
        mockUiBridge.reset();
    });

    test("should process a URL", async function () {
        const result = await runtime1.stringProcessor.processURL("nmshd://qr#", runtime1Session.account);
        expect(result.isError).toBeDefined();

        expect(result.error.code).toBe("error.appStringProcessor.truncatedReferenceInvalid");

        expect(mockUiBridge.enterPasswordNotCalled()).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionNotCalled()).toBeTruthy();
    });

    test("should properly handle a personalized RelationshipTemplate with the correct Identity available", async function () {
        const runtime2SessionAAddress = runtime2SessionA.account.address!;
        assert(runtime2SessionAAddress);

        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            forIdentity: runtime2SessionAAddress
        });

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge.enterPasswordNotCalled()).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionNotCalled()).toBeTruthy();
    });

    test("should properly handle a personalized RelationshipTemplate with the correct Identity not available", async function () {
        const runtime2SessionAAddress = runtime1Session.account.address!;
        assert(runtime2SessionAAddress);

        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            forIdentity: runtime2SessionAAddress
        });

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeAnError("There is no account matching the given 'forIdentityTruncated'.", "error.appruntime.general.noAccountAvailableForIdentityTruncated");

        expect(mockUiBridge.enterPasswordNotCalled()).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionNotCalled()).toBeTruthy();
    });

    test("should properly handle a password protected RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "password" }
        });

        mockUiBridge.passwordToReturn = "password";
        mockUiBridge.accountIdToReturn = runtime2SessionA.account.id;

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge.enterPasswordCalled("pw")).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionCalled(2)).toBeTruthy();
    });

    test("should properly handle a pin protected RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "000000", passwordIsPin: true }
        });

        mockUiBridge.passwordToReturn = "000000";
        mockUiBridge.accountIdToReturn = runtime2SessionA.account.id;

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge.enterPasswordCalled("pin", 6)).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionCalled(2)).toBeTruthy();
    });

    test("should properly handle a password protected personalized RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "password" },
            forIdentity: runtime2SessionA.account.address!
        });

        mockUiBridge.passwordToReturn = "password";

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge.enterPasswordCalled("pw")).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionNotCalled()).toBeTruthy();
    });

    test("should properly handle a pin protected personalized RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "000000", passwordIsPin: true },
            forIdentity: runtime2SessionA.account.address!
        });

        mockUiBridge.passwordToReturn = "000000";

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge.enterPasswordCalled("pin", 6)).toBeTruthy();
        expect(mockUiBridge.requestAccountSelectionNotCalled()).toBeTruthy();
    });

    describe("onboarding", function () {
        let runtime3: AppRuntime;
        const runtime3MockUiBridge = new MockUIBridge();

        beforeAll(async function () {
            runtime3 = await TestUtil.createRuntime(undefined, runtime3MockUiBridge, eventBus);
            await runtime3.start();
        });

        afterAll(async () => await runtime3.stop());

        test("device onboarding with a password protected Token", async function () {
            const deviceResult = await runtime1Session.transportServices.devices.createDevice({});
            const tokenResult = await runtime1Session.transportServices.devices.getDeviceOnboardingToken({
                id: deviceResult.value.id,
                passwordProtection: { password: "password" }
            });

            mockUiBridge.passwordToReturn = "password";

            const result = await runtime2.stringProcessor.processTruncatedReference(tokenResult.value.truncatedReference);
            expect(result).toBeSuccessful();
            expect(result.value).toBeUndefined();

            expect(mockUiBridge.showDeviceOnboardingCalled(deviceResult.value.id)).toBeTruthy();
        });
    });
});
