import { ArbitraryRelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { PeerRelationshipTemplateLoadedEvent } from "@nmshd/runtime";
import assert from "assert";
import { anyNumber, instance, mock, reset, verify, when } from "ts-mockito";
import { AppRuntime, IUIBridge, LocalAccountDTO, LocalAccountSession } from "../../src";
import { MockEventBus, TestUtil } from "../lib";

describe("AppStringProcessor", function () {
    const mockUiBridge: IUIBridge = mock<IUIBridge>();

    when(mockUiBridge.enterPassword(anyNumber())).thenCall((passwordType: number) => {
        switch (passwordType) {
            case 1:
                return "password";
            default:
                return "0".repeat(passwordType);
        }
    });

    const eventBus = new MockEventBus();

    let runtime1: AppRuntime;
    let account: LocalAccountDTO;
    let runtime1Session: LocalAccountSession;

    let runtime2: AppRuntime;

    let runtime2SessionA: LocalAccountSession;

    const templateContent: ArbitraryRelationshipTemplateContentJSON = { "@type": "ArbitraryRelationshipTemplateContent", value: "value" };

    beforeAll(async function () {
        runtime1 = await TestUtil.createRuntime();
        await runtime1.start();

        account = await runtime1.accountServices.createAccount(Math.random().toString(36).substring(7));
        runtime1Session = await runtime1.selectAccount(account.id);

        runtime2 = await TestUtil.createRuntime(undefined, instance(mockUiBridge), eventBus);
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
        reset(mockUiBridge);
    });

    test("should process a URL", async function () {
        const result = await runtime1.stringProcessor.processURL("nmshd://qr#", account);
        expect(result.isError).toBeDefined();

        expect(result.error.code).toBe("error.appStringProcessor.truncatedReferenceInvalid");
    });

    test("should properly handle a personalized RelationshipTemplate", async function () {
        const runtime2SessionAAddress = runtime2SessionA.account.address!;
        assert(runtime2SessionAAddress);

        const templateResult = await runtime1Session.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
            content: templateContent,
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            forIdentity: runtime2SessionAAddress
        });

        await runtime2.stringProcessor.processTruncatedReference(templateResult.value.truncatedReference);

        verify(mockUiBridge.enterPassword(anyNumber())).never();
        eventBus.expectLastPublishedEvent(PeerRelationshipTemplateLoadedEvent);
    });
});
