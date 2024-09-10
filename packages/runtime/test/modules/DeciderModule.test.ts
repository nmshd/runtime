import { RelationshipTemplateContent, Request } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import {
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    MessageProcessedEvent,
    MessageProcessedResult,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult
} from "../../src";
import { RuntimeServiceProvider, TestRequestItem, TestRuntimeServices, establishRelationship, exchangeMessage } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let sender: TestRuntimeServices;
let recipient: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableDeciderModule: true });

    sender = runtimeServices[0];
    recipient = runtimeServices[1];

    await establishRelationship(sender.transport, recipient.transport);
}, 30000);

beforeEach(function () {
    recipient.eventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("DeciderModule", () => {
    test("moves an incoming Request from a Message into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
        const message = await exchangeMessage(sender.transport, recipient.transport);

        const receivedRequestResult = await recipient.consumption.incomingRequests.received({
            receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            requestSourceId: message.id
        });

        await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(recipient.eventBus).toHavePublished(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        const requestAfterAction = await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id });
        expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
    });

    test("triggers MessageProcessedEvent", async () => {
        const message = await exchangeMessage(sender.transport, recipient.transport);

        const receivedRequestResult = await recipient.consumption.incomingRequests.received({
            receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            requestSourceId: message.id
        });

        await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(recipient.eventBus).toHavePublished(MessageProcessedEvent, (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired);
    });

    test("moves an incoming Request from a Relationship Template into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
        const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
        const template = (
            await sender.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: RelationshipTemplateContent.from({
                    onNewRelationship: request
                }).toJSON(),
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
            })
        ).value;

        await recipient.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

        const receivedRequestResult = await recipient.consumption.incomingRequests.received({
            receivedRequest: request.toJSON(),
            requestSourceId: template.id
        });

        await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(recipient.eventBus).toHavePublished(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        const requestAfterAction = await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id });

        expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
    });

    test("triggers RelationshipTemplateProcessedEvent for an incoming Request from a Template after it reached status 'DecisionRequired'", async () => {
        const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
        const template = (
            await sender.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: RelationshipTemplateContent.from({
                    onNewRelationship: request
                }).toJSON(),
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
            })
        ).value;

        await recipient.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

        const receivedRequestResult = await recipient.consumption.incomingRequests.received({
            receivedRequest: request.toJSON(),
            requestSourceId: template.id
        });

        await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await recipient.eventBus.waitForEvent(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        await expect(recipient.eventBus).toHavePublished(
            RelationshipTemplateProcessedEvent,
            (e) => e.data.template.id === template.id && e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired
        );
    });
});
