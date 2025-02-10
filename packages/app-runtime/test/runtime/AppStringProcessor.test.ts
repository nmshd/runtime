import { ArbitraryRelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { DeviceOnboardingInfoDTO, PeerRelationshipTemplateLoadedEvent } from "@nmshd/runtime";
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

        const account = await TestUtil.provideAccounts(runtime1, 1);
        runtime1Session = await runtime1.selectAccount(account[0].id);

        runtime2 = await TestUtil.createRuntime(undefined, mockUiBridge, eventBus);
        await runtime2.start();

        const accounts = await TestUtil.provideAccounts(runtime2, 2);
        runtime2SessionA = await runtime2.selectAccount(accounts[0].id);

        // second account to make sure everything works with multiple accounts
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

        expect(mockUiBridge).enterPasswordNotCalled();
        expect(mockUiBridge).requestAccountSelectionNotCalled();
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

        expect(mockUiBridge).enterPasswordNotCalled();
        expect(mockUiBridge).requestAccountSelectionNotCalled();
    });

    test("should properly handle a personalized RelationshipTemplate with the correct Identity not available", async function () {
        const runtime1SessionAddress = runtime1Session.account.address!;
        assert(runtime1SessionAddress);

        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            forIdentity: runtime1SessionAddress
        });

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeAnError("There is no account matching the given 'forIdentityTruncated'.", "error.appruntime.general.noAccountAvailableForIdentityTruncated");

        expect(mockUiBridge).enterPasswordNotCalled();
        expect(mockUiBridge).requestAccountSelectionNotCalled();
    });

    test("should properly handle a password protected RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "password" }
        });

        mockUiBridge.setPasswordToReturnForAttempt(1, "password");
        mockUiBridge.accountIdToReturn = runtime2SessionA.account.id;

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge).enterPasswordCalled("pw");
        expect(mockUiBridge).requestAccountSelectionCalled(2);
    });

    test("should properly handle a pin protected RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "000000", passwordIsPin: true }
        });

        mockUiBridge.setPasswordToReturnForAttempt(1, "000000");
        mockUiBridge.accountIdToReturn = runtime2SessionA.account.id;

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge).enterPasswordCalled("pin", 6);
        expect(mockUiBridge).requestAccountSelectionCalled(2);
    });

    test("should properly handle a password protected personalized RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "password" },
            forIdentity: runtime2SessionA.account.address!
        });

        mockUiBridge.setPasswordToReturnForAttempt(1, "password");

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge).enterPasswordCalled("pw");
        expect(mockUiBridge).requestAccountSelectionNotCalled();
    });

    test("should properly handle a pin protected personalized RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "000000", passwordIsPin: true },
            forIdentity: runtime2SessionA.account.address!
        });

        mockUiBridge.setPasswordToReturnForAttempt(1, "000000");

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge).enterPasswordCalled("pin", 6);
        expect(mockUiBridge).requestAccountSelectionNotCalled();
    });

    test("should retry for a wrong password when handling a password protected RelationshipTemplate", async function () {
        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            passwordProtection: { password: "password" }
        });

        mockUiBridge.setPasswordToReturnForAttempt(1, "wrongPassword");
        mockUiBridge.setPasswordToReturnForAttempt(2, "password");

        mockUiBridge.accountIdToReturn = runtime2SessionA.account.id;

        const result = await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);
        expect(result).toBeSuccessful();
        expect(result.value).toBeUndefined();

        await expect(eventBus).toHavePublished(PeerRelationshipTemplateLoadedEvent);

        expect(mockUiBridge).enterPasswordCalled("pw", undefined, 1);
        expect(mockUiBridge).enterPasswordCalled("pw", undefined, 2);
        expect(mockUiBridge).requestAccountSelectionCalled(2);
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
            const tokenResult = await runtime1Session.transportServices.devices.createDeviceOnboardingToken({
                id: deviceResult.value.id,
                passwordProtection: { password: "password" }
            });

            mockUiBridge.setPasswordToReturnForAttempt(1, "password");

            const result = await runtime2.stringProcessor.processTruncatedReference(tokenResult.value.truncatedReference);
            expect(result).toBeSuccessful();
            expect(result.value).toBeUndefined();

            expect(mockUiBridge).showDeviceOnboardingCalled((deviceOnboardingInfo: DeviceOnboardingInfoDTO) => deviceOnboardingInfo.id === deviceResult.value.id);
        });

        test("backup device onboarding with a password protected Token", async function () {
            const tokenResult = await runtime1Session.transportServices.identityRecoveryKits.createIdentityRecoveryKit({
                profileName: "profileNameForBackupDevice",
                passwordProtection: { password: "password" }
            });

            mockUiBridge.setPasswordToReturnForAttempt(1, "password");

            const result = await runtime2.stringProcessor.processTruncatedReference(tokenResult.value.truncatedReference);
            expect(result).toBeSuccessful();
            expect(result.value).toBeUndefined();

            expect(mockUiBridge).showDeviceOnboardingCalled((deviceOnboardingInfo: DeviceOnboardingInfoDTO) => deviceOnboardingInfo.isBackupDevice === true);
        });
    });
});
