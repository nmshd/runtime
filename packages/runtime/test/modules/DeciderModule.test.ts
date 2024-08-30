import { RelationshipTemplateContent, Request, ShareAttributeAcceptResponseItemJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import {
    DeciderModuleConfigurationOverwrite,
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

    test("automatically accept a ShareAttributeRequestItem with attribute value type FileReferenceAttribute", async () => {
        const deciderConfig: DeciderModuleConfigurationOverwrite = {
            automationConfig: [
                {
                    requestConfig: {
                        "content.item.@type": "ShareAttributeRequestItem",
                        "attribute.value.@type": "IdentityFileReference"
                    },
                    responseConfig: {
                        accept: true
                    }
                }
            ]
        };
        const automatedService = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];

        const message = await exchangeMessage(sender.transport, automatedService.transport);
        const receivedRequestResult = await automatedService.consumption.incomingRequests.received({
            receivedRequest: {
                "@type": "Request",
                items: [
                    {
                        "@type": "ShareAttributeRequestItem",
                        sourceAttributeId: "ATT",
                        attribute: {
                            "@type": "IdentityAttribute",
                            owner: (await sender.transport.account.getIdentityInfo()).value.address,
                            value: {
                                "@type": "IdentityFileReference",
                                value: "A link to a file with more than 30 characters"
                            }
                        },
                        mustBeAccepted: true
                    }
                ]
            },
            requestSourceId: message.id
        });
        await automatedService.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });
        const receivedRequest = receivedRequestResult.value;

        // TODO: publish an event for automated decisions?
        await expect(automatedService.eventBus).toHavePublished(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.Decided && e.data.request.id === receivedRequest.id
        );

        const requestAfterAction = (await automatedService.consumption.incomingRequests.getRequest({ id: receivedRequest.id })).value;
        expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
        expect(requestAfterAction.response).toBeDefined();
        expect(requestAfterAction.response?.content.result).toBe("Accepted");
        expect(requestAfterAction.response?.content.items[0]["@type"]).toBe("ShareAttributeAcceptResponseItemJSON");

        const sharedAttributeId = (requestAfterAction.response?.content.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
        const sharedAttributeResult = await automatedService.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(sharedAttributeResult).toBeSuccessful();

        // TODO: check the created Attribute properly
        const sharedAttribute = sharedAttributeResult.value;
        expect(sharedAttribute.content.value).toBe("A link to a file with more than 30 characters");
    });
});
