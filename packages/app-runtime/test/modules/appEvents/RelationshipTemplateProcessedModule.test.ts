import { sleep } from "@js-soft/ts-utils";
import { AppRuntime, LocalAccountSession } from "@nmshd/app-runtime";
import { AuthenticationRequestItem, RelationshipTemplateContent } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import assert from "assert";
import { MockEventBus, MockUIBridge, TestUtil } from "../../lib/index.js";

describe("RelationshipTemplateProcessedModule", function () {
    const uiBridge = new MockUIBridge();
    const eventBus = new MockEventBus();

    let runtime1: AppRuntime;
    let session1: LocalAccountSession;
    let session2: LocalAccountSession;

    beforeAll(async function () {
        runtime1 = await TestUtil.createRuntime(undefined, uiBridge, eventBus);
        await runtime1.start();

        const [localAccount1, localAccount2] = await TestUtil.provideAccounts(runtime1, 2);

        session1 = await runtime1.selectAccount(localAccount1.id);
        session2 = await runtime1.selectAccount(localAccount2.id);
    });

    afterAll(async function () {
        await runtime1.stop();
    });

    afterEach(async function () {
        uiBridge.reset();
        eventBus.reset();

        const incomingRequests = await session2.consumptionServices.incomingRequests.getRequests({ query: { status: ["Open", "DecisionRequired", "ManualDecisionRequired"] } });
        for (const request of incomingRequests.value) {
            const response = await session2.consumptionServices.incomingRequests.reject({ requestId: request.id, items: [{ accept: false }] });
            assert(response.isSuccess);
        }

        await eventBus.waitForRunningEventHandlers();
    });

    test("should show request when RelationshipTemplateProcessedEvent is received with ManualRequestDecisionRequired", async function () {
        await TestUtil.createAndLoadPeerTemplate(
            session1,
            session2,
            RelationshipTemplateContent.from({ onNewRelationship: { items: [AuthenticationRequestItem.from({ title: "aTitle", mustBeAccepted: false })] } }).toJSON()
        );
        await eventBus.waitForRunningEventHandlers();

        expect(uiBridge).showRequestCalled();
    });

    test("should show an error when RelationshipTemplateProcessedEvent is received with an expired Request on new Relationship", async function () {
        const templateFrom = (
            await session1.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content: RelationshipTemplateContent.from({
                    onNewRelationship: { expiresAt: CoreDate.utc().add({ seconds: 2 }), items: [AuthenticationRequestItem.from({ title: "aTitle", mustBeAccepted: false })] }
                }).toJSON(),
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toString(),
                maxNumberOfAllocations: 1
            })
        ).value;

        await sleep(3000);
        await session2.transportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templateFrom.reference.truncated });
        await eventBus.waitForRunningEventHandlers();

        expect(uiBridge).showRequestNotCalled();
        expect(uiBridge).showErrorCalled("error.relationshipTemplateProcessedModule.requestExpired");
    });

    test("should show an error when RelationshipTemplateProcessedEvent is received with an expired Request on existing Relationship", async function () {
        await TestUtil.addRelationship(session1, session2);

        const templateFrom = (
            await session1.transportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content: RelationshipTemplateContent.from({
                    onNewRelationship: {
                        "@type": "Request",
                        items: [{ "@type": "AuthenticationRequestItem", title: "aTitle", mustBeAccepted: false }]
                    },
                    onExistingRelationship: {
                        "@type": "Request",
                        items: [{ "@type": "AuthenticationRequestItem", title: "aTitle", mustBeAccepted: false }],
                        expiresAt: CoreDate.utc().add({ seconds: 2 }).toString()
                    }
                }).toJSON(),
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toString(),
                maxNumberOfAllocations: 1
            })
        ).value;

        await sleep(3000);
        await session2.transportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templateFrom.reference.truncated });
        await eventBus.waitForRunningEventHandlers();

        expect(uiBridge).showRequestNotCalled();
        expect(uiBridge).showErrorCalled("error.relationshipTemplateProcessedModule.requestExpired");
    });
});
