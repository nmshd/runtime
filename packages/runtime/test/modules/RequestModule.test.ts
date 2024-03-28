import { DecideRequestItemParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    RelationshipCreationChangeRequestContentJSON,
    RelationshipTemplateContentJSON,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    LocalRequestDTO,
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
import {
    ensureActiveRelationship,
    exchangeAndAcceptRequestByMessage,
    exchangeMessageWithRequest,
    exchangeTemplate,
    MockEventBus,
    RuntimeServiceProvider,
    sendMessage,
    sendMessageWithRequest,
    syncUntilHasMessages,
    syncUntilHasMessageWithResponse,
    syncUntilHasRelationships,
    TestRuntimeServices
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sRuntimeServices: TestRuntimeServices;
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;

let rRuntimeServices: TestRuntimeServices;
let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rEventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true });

    sRuntimeServices = runtimeServices[0];
    sTransportServices = sRuntimeServices.transport;
    sConsumptionServices = sRuntimeServices.consumption;
    sEventBus = sRuntimeServices.eventBus;

    rRuntimeServices = runtimeServices[1];
    rTransportServices = rRuntimeServices.transport;
    rConsumptionServices = rRuntimeServices.consumption;
    rEventBus = rRuntimeServices.eventBus;
}, 30000);

afterEach(() => {
    sEventBus.reset();
    rEventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("RequestModule", () => {
    describe("Relationships / RelationshipTemplates (onNewRelationship)", () => {
        let template: RelationshipTemplateDTO;

        const metadata = { aMetadataKey: "aMetadataValue" };
        const templateContent: RelationshipTemplateContentJSON = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            metadata
        };

        async function getRequestIdOfTemplate(eventBus: MockEventBus, templateId: string) {
            let requests: LocalRequestDTO[];
            requests = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": templateId } })).value;
            if (requests.length === 0) {
                await eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
                requests = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": templateId } })).value;
            }
            return requests[0].id;
        }

        async function ensureActiveRelationshipWithTemplate(sRuntimeServices: TestRuntimeServices, rRuntimeServices: TestRuntimeServices, template: RelationshipTemplateDTO) {
            if ((await sTransportServices.relationships.getRelationships({})).value.length === 0) {
                await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
                const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
                await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
                const relationship = (await syncUntilHasRelationships(sTransportServices, 1))[0];
                await sTransportServices.relationships.acceptRelationshipChange({
                    relationshipId: relationship.id,
                    changeId: relationship.changes[0].id,
                    content: {}
                });
            }
        }

        beforeAll(async () => {
            template = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
        });

        test("creates a request for a loaded peer Relationship Template and checks its prerequisites", async () => {
            await expect(rEventBus).toHavePublished(IncomingRequestReceivedEvent);
            await expect(rEventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requestsResult = await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } });
            expect(requestsResult.value).toHaveLength(1);
        });

        test("does not create a second Request from the same Template if an open Request exists", async () => {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists);

            const requestsWithTemplateAsSource = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsWithTemplateAsSource).toHaveLength(1);
        });

        test("completes the Request when the Request is accepted by creating a Relationship", async () => {
            const requestId = await getRequestIdOfTemplate(rEventBus, template.id);
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });

            await expect(rEventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);

            const getRelationshipsResult = await rTransportServices.relationships.getRelationships({});
            expect(getRelationshipsResult).toBeSuccessful();

            expect(getRelationshipsResult.value).toHaveLength(1);
            expect(getRelationshipsResult.value[0].status).toBe(RelationshipStatus.Pending);
        });

        test("triggers RelationshipTemplateProcessedEvent when another Template is loaded and a pending Relationship exists", async () => {
            const requestId = await getRequestIdOfTemplate(rEventBus, template.id);
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
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
            const requestId = await getRequestIdOfTemplate(rEventBus, template.id);
            const relationships = (await rTransportServices.relationships.getRelationships({})).value;
            if (relationships.length === 0) {
                await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
                await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
            }
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists);
        });

        test("templator: creates a Relationship with the correct data on an incoming Relationship Change with a Response", async () => {
            const requestId = await getRequestIdOfTemplate(rEventBus, template.id);
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
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
            await syncUntilHasRelationships(rTransportServices, 1);
        });

        test("does not create a second Request from the same Template if an active Relationship exists", async () => {
            await ensureActiveRelationship(sTransportServices, rTransportServices);
            rEventBus.reset();
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            await expect(rEventBus).not.toHavePublished(IncomingRequestReceivedEvent);

            const requestsFromTemplate = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsFromTemplate).toHaveLength(1);
        });

        test("triggers RelationshipTemplateProcessedEvent if an active Relationship exists", async () => {
            await ensureActiveRelationshipWithTemplate(sRuntimeServices, rRuntimeServices, template);

            rEventBus.reset();
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

            const requests = (
                await rConsumptionServices.incomingRequests.getRequests({
                    query: { "source.reference": template.id }
                })
            ).value;
            const request = requests[0];

            const requestAfterReject = (await rConsumptionServices.incomingRequests.reject({ requestId: request.id, items: [{ accept: false }] })).value;

            await rEventBus.waitForRunningEventHandlers();

            await expect(rEventBus).toHavePublished(MessageSentEvent, (e) => e.data.content?.response?.requestId === requestAfterReject.response!.content.requestId);
        });

        test("receives the rejected Request by Message", async () => {
            const template = await exchangeRelationshipTemplate();
            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rConsumptionServices.incomingRequests.reject({ requestId, items: [{ accept: false }] });
            await syncUntilHasMessageWithResponse(sTransportServices, requestId);

            await sEventBus.waitForRunningEventHandlers();

            await expect(sEventBus).toHavePublished(OutgoingRequestCreatedAndCompletedEvent, (e) => e.data.id === requestId);

            const request = (await sConsumptionServices.outgoingRequests.getRequest({ id: requestId })).value;
            expect(request.status).toBe(LocalRequestStatus.Completed);
            expect(request.response!.content.result).toBe(ResponseResult.Rejected);
        });

        test("sends the Accept-Response by Message", async () => {
            const template = await exchangeRelationshipTemplate();

            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;

            const requestAfterReject = (await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: false }] })).value;

            await rEventBus.waitForRunningEventHandlers();

            await expect(rEventBus).toHavePublished(MessageSentEvent, (e) => e.data.content?.response?.requestId === requestAfterReject.response!.content.requestId);
        });

        test("receives the accepted Request by Message", async () => {
            const template = await exchangeRelationshipTemplate();
            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: false }] });
            await syncUntilHasMessageWithResponse(sTransportServices, requestId);

            await sEventBus.waitForRunningEventHandlers();

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
                                owner: CoreAddress.from(""),
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
        let requestContent: CreateOutgoingRequestRequest;
        let responseItems: DecideRequestItemParametersJSON[];

        beforeAll(async () => {
            recipientAddress = (await ensureActiveRelationship(sTransportServices, rTransportServices)).peer;
            requestContent = {
                content: { items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                peer: recipientAddress
            };
            responseItems = [{ accept: true }];
        });

        test("sending the request moves the request status to open", async () => {
            const message = await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);

            await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (event) => event.data.newStatus === LocalRequestStatus.Open);

            const requestAfterAction = (await sConsumptionServices.outgoingRequests.getRequest({ id: message.content.id })).value;

            expect(requestAfterAction.status).toBe(LocalRequestStatus.Open);
        });

        test("the incoming request is created and moved to status DecisionRequired", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);

            // kick every event created from requests of previous tests
            const receivedEvents = rEventBus.publishedEvents;
            const lastEvent = receivedEvents[receivedEvents.length - 1];
            const secondToLastEvent = receivedEvents[receivedEvents.length - 2];
            rEventBus.reset();
            rEventBus.publish(secondToLastEvent);
            rEventBus.publish(lastEvent);

            const incomingRequestReceivedEvent = await rEventBus.waitForEvent(IncomingRequestReceivedEvent);
            const request = incomingRequestReceivedEvent.data;
            expect(request.id).toBe(message.content.id);

            const incomingRequestStatusChangedEvent = await rEventBus.waitForEvent(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired
            );

            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);

            const requestsResult = await rConsumptionServices.incomingRequests.getRequest({ id: message.content.id });
            expect(requestsResult).toBeSuccessful();
        });

        test("triggers a MessageProcessedEvent when the incoming Message does not contain a Request", async () => {
            await sendMessage(sTransportServices, recipientAddress, {});

            await syncUntilHasMessages(rTransportServices, 1);

            await expect(rEventBus).toHavePublished(MessageProcessedEvent);
        });

        test("sends a message when the request is accepted", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const acceptRequestResult = await rConsumptionServices.incomingRequests.accept({ requestId: message.content.id, items: [{ accept: true }] });
            expect(acceptRequestResult).toBeSuccessful();

            const incomingRequestStatusChangedEvent = await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.Completed);

            const messageSentEvent = await rEventBus.waitForEvent(MessageSentEvent);
            expect(messageSentEvent.data.content["@type"]).toBe("ResponseWrapper");
        });

        test("processes the response", async () => {
            await expect(exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems)).resolves.not.toThrow();
        });
    });
});
