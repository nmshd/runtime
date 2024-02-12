import { LocalRequestStatus } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    RelationshipCreationChangeRequestContentJSON,
    RelationshipTemplateContentJSON,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import {
    ConsumptionServices,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    MessageProcessedEvent,
    MessageSentEvent,
    OutgoingRequestCreatedAndCompletedEvent,
    OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent,
    OutgoingRequestStatusChangedEvent,
    RelationshipStatus,
    RelationshipTemplateDTO,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult,
    TransportServices
} from "../../src";
import { ensureActiveRelationship, exchangeTemplate, MockEventBus, RuntimeServiceProvider, sendMessage, syncUntilHasMessages, syncUntilHasRelationships } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;

let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rEventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true });
    sTransportServices = runtimeServices[1].transport;
    sConsumptionServices = runtimeServices[1].consumption;
    sEventBus = runtimeServices[1].eventBus;

    rTransportServices = runtimeServices[0].transport;
    rConsumptionServices = runtimeServices[0].consumption;
    rEventBus = runtimeServices[0].eventBus;
}, 30000);

beforeEach(() => {
    sEventBus.reset();
    rEventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("RequestModule", () => {
    describe("Relationships / RelationshipTemplates (onNewRelationship)", () => {
        const metadata = { aMetadataKey: "aMetadataValue" };
        let requestId: string;
        let template: RelationshipTemplateDTO;

        test("creates a request for a loaded peer Relationship Template and checks its prerequisites", async () => {
            const templateContent: RelationshipTemplateContentJSON = {
                "@type": "RelationshipTemplateContent",
                onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                metadata
            };

            template = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

            await expect(rEventBus).toHavePublished(IncomingRequestReceivedEvent);
            await expect(rEventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requestsResult = await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } });
            expect(requestsResult.value).toHaveLength(1);

            requestId = requestsResult.value[0].id;
        });

        test("does not create a second Request from the same Template if an open Request exists", async () => {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists);

            const requestsWithTemplateAsSource = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsWithTemplateAsSource).toHaveLength(1);
        });

        test("completes the Request when the Request is accepted by creating a Relationship", async () => {
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });

            await expect(rEventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);

            const getRelationshipsResult = await rTransportServices.relationships.getRelationships({});
            expect(getRelationshipsResult).toBeSuccessful();

            expect(getRelationshipsResult.value).toHaveLength(1);
            expect(getRelationshipsResult.value[0].status).toBe(RelationshipStatus.Pending);
        });

        test("triggers RelationshipTemplateProcessedEvent when another Template is loaded and a pending Relationship exists", async () => {
            const templateContent: RelationshipTemplateContentJSON = {
                "@type": "RelationshipTemplateContent",
                onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                metadata
            };

            await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists);
        });

        test("triggers RelationshipTemplateProcessedEvent if there is no request in the template", async () => {
            await exchangeTemplate(sTransportServices, rTransportServices, {});

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.NoRequest);
        });

        test("triggers RelationshipTemplateProcessedEvent if a pending Relationship exists", async () => {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists);
        });

        test("templator: creates a Relationship with the correct data on an incoming Relationship Change with a Response", async () => {
            const relationships = await syncUntilHasRelationships(sTransportServices, 1);
            expect(relationships).toHaveLength(1);

            const relationship = relationships[0];

            const creationChangeRequestContent = relationship.changes[0].request.content as RelationshipCreationChangeRequestContentJSON;
            expect(creationChangeRequestContent["@type"]).toBe("RelationshipCreationChangeRequestContent");

            const response = creationChangeRequestContent.response;
            const responseItems = response.items;
            expect(responseItems).toHaveLength(1);

            const responseItem = responseItems[0] as ResponseItemJSON;
            expect(responseItem["@type"]).toBe("AcceptResponseItem");
            expect(responseItem.result).toBe(ResponseItemResult.Accepted);

            await expect(sEventBus).toHavePublished(OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent, (e) => e.data.id === response.requestId);

            const requestsResult = await sConsumptionServices.outgoingRequests.getRequest({ id: response.requestId });
            expect(requestsResult).toBeSuccessful();

            await sTransportServices.relationships.acceptRelationshipChange({ relationshipId: relationship.id, changeId: relationship.changes[0].id, content: {} });
        });

        test("does not create a second Request from the same Template if an active Relationship exists", async () => {
            await syncUntilHasRelationships(rTransportServices);
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).not.toHavePublished(IncomingRequestReceivedEvent);

            const requestsFromTemplate = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsFromTemplate).toHaveLength(1);
        });

        test("triggers RelationshipTemplateProcessedEvent if an active Relationship exists", async () => {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists);
        });
    });

    describe("Relationships / RelationshipTemplates (onExistingRelationship)", () => {
        beforeAll(async () => await ensureActiveRelationship(sTransportServices, rTransportServices));

        test("creates a request from onExistingRelationship if a relationship already exists", async () => {
            const template = await exchangeRelationshipTemplate();

            await expect(rEventBus).toHavePublished(IncomingRequestReceivedEvent);
            await expect(rEventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requests = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requests).toHaveLength(1);

            const request = requests[0];

            expect(request.content.items[0]["@type"]).toBe("CreateAttributeRequestItem");
        });

        test("triggers RelationshipTemplateProcessedEvent if an active Relationship exists", async () => {
            const template = await exchangeRelationshipTemplate();

            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists);
        });

        test("sends the Reject-Response by Message", async () => {
            const template = await exchangeRelationshipTemplate();

            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requests = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;
            const request = requests[0];

            const requestAfterReject = (await rConsumptionServices.incomingRequests.reject({ requestId: request.id, items: [{ accept: false }] })).value;

            await rEventBus.waitForRunningEventHandlers();

            await expect(rEventBus).toHavePublished(MessageSentEvent, (e) => e.data.content?.response?.requestId === requestAfterReject.response!.content.requestId);
        });

        test("receives the rejected Request by Message", async () => {
            const message = (await syncUntilHasMessages(sTransportServices, 1))[0];

            await sEventBus.waitForRunningEventHandlers();

            const requestId = message.content.requestId;

            await expect(sEventBus).toHavePublished(OutgoingRequestCreatedAndCompletedEvent, (e) => e.data.id === requestId);

            const request = (await sConsumptionServices.outgoingRequests.getRequest({ id: requestId })).value;
            expect(request.status).toBe(LocalRequestStatus.Completed);
            expect(request.response!.content.result).toBe(ResponseResult.Rejected);
        });

        test("sends the Accept-Response by Message", async () => {
            const template = await exchangeRelationshipTemplate();

            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requests = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;
            const request = requests[0];

            const requestAfterReject = (await rConsumptionServices.incomingRequests.accept({ requestId: request.id, items: [{ accept: false }] })).value;

            await rEventBus.waitForRunningEventHandlers();

            await expect(rEventBus).toHavePublished(MessageSentEvent, (e) => e.data.content?.response?.requestId === requestAfterReject.response!.content.requestId);
        });

        test("receives the accepted Request by Message", async () => {
            const message = (await syncUntilHasMessages(sTransportServices, 1))[0];

            await sEventBus.waitForRunningEventHandlers();

            const requestId = message.content.requestId;

            await expect(sEventBus).toHavePublished(OutgoingRequestCreatedAndCompletedEvent, (e) => e.data.id === requestId);

            const request = (await sConsumptionServices.outgoingRequests.getRequest({ id: requestId })).value;
            expect(request.status).toBe(LocalRequestStatus.Completed);
            expect(request.response!.content.result).toBe(ResponseResult.Accepted);
        });

        async function exchangeRelationshipTemplate() {
            const templateContent: RelationshipTemplateContentJSON = {
                "@type": "RelationshipTemplateContent",
                onNewRelationship: {
                    "@type": "Request",
                    items: [{ "@type": "TestRequestItem", mustBeAccepted: false }]
                },
                onExistingRelationship: {
                    "@type": "Request",
                    items: [
                        {
                            "@type": "CreateAttributeRequestItem",
                            mustBeAccepted: false,
                            attribute: IdentityAttribute.from({
                                owner: (await rTransportServices.account.getIdentityInfo()).value.address,
                                value: GivenName.from("AGivenName").toJSON()
                            }).toJSON()
                        }
                    ]
                }
            };

            const template = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

            return template;
        }
    });

    describe("Messages", () => {
        let recipientAddress: string;
        let requestId: string;

        beforeAll(async () => {
            recipientAddress = (await ensureActiveRelationship(sTransportServices, rTransportServices)).peer;
        });

        test("sending the request moves the request status to open", async () => {
            const createRequestResult = await sConsumptionServices.outgoingRequests.create({
                content: { items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                peer: recipientAddress
            });

            requestId = createRequestResult.value.id;

            await sendMessage(sTransportServices, recipientAddress, createRequestResult.value.content);

            await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (event) => event.data.newStatus === LocalRequestStatus.Open);

            const requestAfterAction = (await sConsumptionServices.outgoingRequests.getRequest({ id: requestId })).value;

            expect(requestAfterAction.status).toBe(LocalRequestStatus.Open);
        });

        test("the incoming request is created and moved to status DecisionRequired", async () => {
            const messages = await syncUntilHasMessages(rTransportServices, 1);
            expect(messages).toHaveLength(1);

            const incomingRequestReceivedEvent = await rEventBus.waitForEvent(IncomingRequestReceivedEvent);
            const request = incomingRequestReceivedEvent.data;
            expect(request.id).toBe(requestId);

            const incomingRequestStatusChangedEvent = await rEventBus.waitForEvent(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired
            );

            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);

            const requestsResult = await rConsumptionServices.incomingRequests.getRequest({ id: requestId });
            expect(requestsResult).toBeSuccessful();
        });

        test("triggers a MessageProcessedEvent when the incoming Message does not contain a Request", async () => {
            await sendMessage(sTransportServices, recipientAddress, {});

            await syncUntilHasMessages(rTransportServices, 1);

            await expect(rEventBus).toHavePublished(MessageProcessedEvent);
        });

        test("sends a message when the request is accepted", async () => {
            const acceptRequestResult = await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
            expect(acceptRequestResult).toBeSuccessful();

            const incomingRequestStatusChangedEvent = await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.Completed);

            const messageSentEvent = await rEventBus.waitForEvent(MessageSentEvent);
            expect(messageSentEvent.data.content["@type"]).toBe("ResponseWrapper");
        });

        test("processes the response", async () => {
            const messages = await syncUntilHasMessages(sTransportServices, 1);
            expect(messages).toHaveLength(1);

            const outgoingRequestStatusChangedEvent = await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
            expect(outgoingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.Completed);
        });
    });
});
