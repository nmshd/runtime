import { sleep } from "@js-soft/ts-utils";
import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipCreationContentJSON,
    RelationshipTemplateContent,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseResult,
    ResponseWrapperJSON
} from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import {
    CreateOutgoingRequestRequest,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    LocalRequestDTO,
    LocalRequestStatus,
    MessageProcessedEvent,
    MessageSentEvent,
    OutgoingRequestCreatedAndCompletedEvent,
    OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent,
    OutgoingRequestStatusChangedEvent,
    RelationshipDTO,
    RelationshipStatus,
    RelationshipTemplateDTO,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult
} from "../../src";
import {
    MockEventBus,
    RuntimeServiceProvider,
    TestRuntimeServices,
    createTemplate,
    ensureActiveRelationship,
    establishPendingRelationshipWithRequestFlow,
    exchangeAndAcceptRequestByMessage,
    exchangeMessageWithRequest,
    exchangeTemplate,
    executeFullCreateAndShareRelationshipAttributeFlow,
    sendMessage,
    sendMessageWithRequest,
    syncUntilHasMessageWithResponse,
    syncUntilHasMessages,
    syncUntilHasRelationships
} from "../lib";

describe("RequestModule", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();
    let sRuntimeServices: TestRuntimeServices;
    let rRuntimeServices: TestRuntimeServices;

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true });

        sRuntimeServices = runtimeServices[0];
        rRuntimeServices = runtimeServices[1];
    }, 30000);

    afterEach(() => {
        sRuntimeServices.eventBus.reset();
        rRuntimeServices.eventBus.reset();
    });

    afterAll(async () => await runtimeServiceProvider.stop());

    describe("Relationships / RelationshipTemplates (onNewRelationship)", () => {
        let template: RelationshipTemplateDTO;

        const metadata = { aMetadataKey: "aMetadataValue" };
        const templateContent = RelationshipTemplateContent.from({
            onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            metadata
        }).toJSON();

        async function getRequestIdOfTemplate(eventBus: MockEventBus, templateId: string) {
            let requests: LocalRequestDTO[];
            requests = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": templateId } })).value;
            if (requests.length === 0) {
                await eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
                requests = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": templateId } })).value;
            }
            return requests[0].id;
        }

        async function ensureActiveRelationshipWithTemplate(sRuntimeServices: TestRuntimeServices, rRuntimeServices: TestRuntimeServices, template: RelationshipTemplateDTO) {
            if ((await sRuntimeServices.transport.relationships.getRelationships({})).value.length === 0) {
                await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });
                const requestId = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
                await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });
                const relationship = (await syncUntilHasRelationships(sRuntimeServices.transport, 1))[0];
                await sRuntimeServices.transport.relationships.acceptRelationship({
                    relationshipId: relationship.id
                });
            }
        }

        beforeAll(async () => {
            template = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, templateContent);
        });

        test("creates a request for a loaded peer Relationship Template and checks its prerequisites", async () => {
            await expect(rRuntimeServices.eventBus).toHavePublished(IncomingRequestReceivedEvent);
            await expect(rRuntimeServices.eventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requestsResult = await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } });
            expect(requestsResult.value).toHaveLength(1);
        });

        test("does not create a second Request from the same Template if an open Request exists", async () => {
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists
            );

            const requestsWithTemplateAsSource = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsWithTemplateAsSource).toHaveLength(1);
        });

        test("completes the Request when the Request is accepted by creating a Relationship", async () => {
            const requestId = await getRequestIdOfTemplate(rRuntimeServices.eventBus, template.id);
            await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

            await expect(rRuntimeServices.eventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);

            const getRelationshipsResult = await rRuntimeServices.transport.relationships.getRelationships({});
            expect(getRelationshipsResult).toBeSuccessful();

            expect(getRelationshipsResult.value).toHaveLength(1);
            expect(getRelationshipsResult.value[0].status).toBe(RelationshipStatus.Pending);
        });

        test("triggers RelationshipTemplateProcessedEvent when another Template is loaded and a pending Relationship exists", async () => {
            const requestId = await getRequestIdOfTemplate(rRuntimeServices.eventBus, template.id);
            await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });
            const templateContent = RelationshipTemplateContent.from({
                onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                metadata
            }).toJSON();

            await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, templateContent);

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists
            );
        });

        test("triggers RelationshipTemplateProcessedEvent if there is no request in the template", async () => {
            await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport);

            await expect(rRuntimeServices.eventBus).toHavePublished(RelationshipTemplateProcessedEvent, (e) => e.data.result === RelationshipTemplateProcessedResult.NoRequest);
        });

        test("triggers RelationshipTemplateProcessedEvent if a pending Relationship exists", async () => {
            const requestId = await getRequestIdOfTemplate(rRuntimeServices.eventBus, template.id);
            const relationships = (await rRuntimeServices.transport.relationships.getRelationships({})).value;
            if (relationships.length === 0) {
                await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });
                await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
            }
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists
            );
        });

        test("templator: creates a Relationship with the correct data on an incoming Relationship Change with a Response", async () => {
            const requestId = await getRequestIdOfTemplate(rRuntimeServices.eventBus, template.id);
            await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });
            const relationships = await syncUntilHasRelationships(sRuntimeServices.transport, 1);

            expect(relationships).toHaveLength(1);

            const relationship = relationships[0];

            const creationContent = relationship.creationContent as RelationshipCreationContentJSON;
            expect(creationContent["@type"]).toBe("RelationshipCreationContent");

            const response = creationContent.response;
            const responseItems = response.items;
            expect(responseItems).toHaveLength(1);

            const responseItem = responseItems[0] as ResponseItemJSON;
            expect(responseItem["@type"]).toBe("AcceptResponseItem");
            expect(responseItem.result).toBe(ResponseItemResult.Accepted);

            await expect(sRuntimeServices.eventBus).toHavePublished(OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent, (e) => e.data.id === response.requestId);

            const requestsResult = await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: response.requestId });
            expect(requestsResult).toBeSuccessful();

            await sRuntimeServices.transport.relationships.acceptRelationship({ relationshipId: relationship.id });
            await syncUntilHasRelationships(rRuntimeServices.transport, 1);
        });

        test("does not create a second Request from the same Template if an active Relationship exists", async () => {
            await ensureActiveRelationship(sRuntimeServices.transport, rRuntimeServices.transport);
            rRuntimeServices.eventBus.reset();
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).not.toHavePublished(IncomingRequestReceivedEvent);

            const requestsFromTemplate = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requestsFromTemplate).toHaveLength(1);
        });

        test("triggers RelationshipTemplateProcessedEvent if an active Relationship exists", async () => {
            await ensureActiveRelationshipWithTemplate(sRuntimeServices, rRuntimeServices, template);

            rRuntimeServices.eventBus.reset();
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists
            );
        });

        test("triggers RelationshipTemplateProcessedEvent if a terminated Relationship exists", async () => {
            await ensureActiveRelationshipWithTemplate(sRuntimeServices, rRuntimeServices, template);
            const relationshipId = (await rRuntimeServices.transport.relationships.getRelationships({})).value[0].id;

            await rRuntimeServices.transport.relationships.terminateRelationship({ relationshipId });

            rRuntimeServices.eventBus.reset();
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists
            );
        });

        test("triggers RelationshipTemplateProcessedEvent if a Relationship whose deletion is proposed exists", async () => {
            await ensureActiveRelationshipWithTemplate(sRuntimeServices, rRuntimeServices, template);
            const relationshipId = (await rRuntimeServices.transport.relationships.getRelationships({})).value[0].id;

            await rRuntimeServices.transport.relationships.terminateRelationship({ relationshipId });
            await syncUntilHasRelationships(sRuntimeServices.transport, 1);

            await sRuntimeServices.transport.relationships.decomposeRelationship({ relationshipId });
            await syncUntilHasRelationships(rRuntimeServices.transport, 1);

            rRuntimeServices.eventBus.reset();
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RelationshipExists
            );
        });

        test("triggers RelationshipTemplateProcessedEvent if the Request is expired", async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true });
            const sRuntimeServices = runtimeServices[0];
            const rRuntimeServices = runtimeServices[1];

            const templateContent = RelationshipTemplateContent.from({
                onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }], expiresAt: CoreDate.utc().add({ seconds: 2 }).toString() }
            }).toJSON();
            const templateWithExpiredRequest = await createTemplate(sRuntimeServices.transport, templateContent);

            await sleep(3000);
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templateWithExpiredRequest.reference.truncated });

            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RequestExpired
            );
        });
    });

    describe("Relationships / RelationshipTemplates (onExistingRelationship)", () => {
        beforeAll(async () => await ensureActiveRelationship(sRuntimeServices.transport, rRuntimeServices.transport));

        test("creates a request from onExistingRelationship if a relationship already exists", async () => {
            const template = await exchangeRelationshipTemplate();

            await expect(rRuntimeServices.eventBus).toHavePublished(IncomingRequestReceivedEvent);
            await expect(rRuntimeServices.eventBus).toHavePublished(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requests = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value;

            expect(requests).toHaveLength(1);

            const request = requests[0];

            expect(request.content.items[0]["@type"]).toBe("CreateAttributeRequestItem");
        });

        test("triggers RelationshipTemplateProcessedEvent if an active Relationship exists", async () => {
            const template = await exchangeRelationshipTemplate();
            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.reference.truncated });

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists
            );
        });

        test("triggers RelationshipTemplateProcessedEvent if the Request is expired", async () => {
            const templateContent = RelationshipTemplateContent.from({
                onNewRelationship: {
                    "@type": "Request",
                    items: [{ "@type": "TestRequestItem", mustBeAccepted: false }]
                },
                onExistingRelationship: {
                    "@type": "Request",
                    items: [{ "@type": "TestRequestItem", mustBeAccepted: false }],
                    expiresAt: CoreDate.utc().add({ seconds: 2 }).toString()
                }
            }).toJSON();
            const templateWithExpiredRequest = await createTemplate(sRuntimeServices.transport, templateContent);

            await sleep(3000);
            await rRuntimeServices.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templateWithExpiredRequest.reference.truncated });

            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(rRuntimeServices.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.result === RelationshipTemplateProcessedResult.RequestExpired
            );
        });

        test("sends the Reject-Response by Message", async () => {
            const template = await exchangeRelationshipTemplate();

            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requests = (
                await rRuntimeServices.consumption.incomingRequests.getRequests({
                    query: { "source.reference": template.id }
                })
            ).value;
            const request = requests[0];

            const requestAfterReject = (await rRuntimeServices.consumption.incomingRequests.reject({ requestId: request.id, items: [{ accept: false }] })).value;

            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(rRuntimeServices.eventBus).toHavePublished(
                MessageSentEvent,
                (e) => (e.data.content as ResponseWrapperJSON).response.requestId === requestAfterReject.response!.content.requestId
            );
        });

        test("receives the rejected Request by Message", async () => {
            const template = await exchangeRelationshipTemplate();
            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const requestId = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rRuntimeServices.consumption.incomingRequests.reject({ requestId, items: [{ accept: false }] });
            await syncUntilHasMessageWithResponse(sRuntimeServices.transport, requestId);

            await sRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(sRuntimeServices.eventBus).toHavePublished(OutgoingRequestCreatedAndCompletedEvent, (e) => e.data.id === requestId);

            const request = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
            expect(request.status).toBe(LocalRequestStatus.Completed);
            expect(request.response!.content.result).toBe(ResponseResult.Rejected);
        });

        test("sends the Accept-Response by Message", async () => {
            const template = await exchangeRelationshipTemplate();

            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

            const requestId = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;

            const requestAfterReject = (await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: false }] })).value;

            await rRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(rRuntimeServices.eventBus).toHavePublished(
                MessageSentEvent,
                (e) => (e.data.content as ResponseWrapperJSON).response.requestId === requestAfterReject.response!.content.requestId
            );
        });

        test("receives the accepted Request by Message", async () => {
            const template = await exchangeRelationshipTemplate();
            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const requestId = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rRuntimeServices.consumption.incomingRequests.accept({ requestId, items: [{ accept: false }] });
            await syncUntilHasMessageWithResponse(sRuntimeServices.transport, requestId);

            await sRuntimeServices.eventBus.waitForRunningEventHandlers();

            await expect(sRuntimeServices.eventBus).toHavePublished(OutgoingRequestCreatedAndCompletedEvent, (e) => e.data.id === requestId);

            const request = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
            expect(request.status).toBe(LocalRequestStatus.Completed);
            expect(request.response!.content.result).toBe(ResponseResult.Accepted);
        });

        async function exchangeRelationshipTemplate() {
            const templateContent = RelationshipTemplateContent.from({
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
                                value: GivenName.from("aGivenName").toJSON()
                            }).toJSON()
                        }
                    ]
                }
            }).toJSON();

            const template = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, templateContent);

            return template;
        }
    });

    describe("Messages", () => {
        let recipientAddress: string;
        let requestContent: CreateOutgoingRequestRequest;
        let responseItems: DecideRequestItemParametersJSON[];

        beforeAll(async () => {
            recipientAddress = (await ensureActiveRelationship(sRuntimeServices.transport, rRuntimeServices.transport)).peer;
            requestContent = {
                content: { items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                peer: recipientAddress
            };
            responseItems = [{ accept: true }];
        });

        test("sending the request moves the request status to open", async () => {
            const message = await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);

            await sRuntimeServices.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (event) => event.data.newStatus === LocalRequestStatus.Open);

            const requestAfterAction = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: message.content.id! })).value;

            expect(requestAfterAction.status).toBe(LocalRequestStatus.Open);
        });

        test("the incoming request is created and moved to status DecisionRequired", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);

            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestReceivedEvent, (e) => e.data.id === message.content.id);
            const incomingRequestStatusChangedEvent = await rRuntimeServices.eventBus.waitForEvent(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired
            );

            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);

            const requestsResult = await rRuntimeServices.consumption.incomingRequests.getRequest({ id: message.content.id! });
            expect(requestsResult).toBeSuccessful();
        });

        test("triggers a MessageProcessedEvent when the incoming Message does not contain a Request", async () => {
            await sendMessage(sRuntimeServices.transport, recipientAddress);

            await syncUntilHasMessages(rRuntimeServices.transport, 1);

            await expect(rRuntimeServices.eventBus).toHavePublished(MessageProcessedEvent);
        });

        test("sends a message when the request is accepted", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            await rRuntimeServices.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            const acceptRequestResult = await rRuntimeServices.consumption.incomingRequests.accept({ requestId: message.content.id!, items: [{ accept: true }] });
            expect(acceptRequestResult).toBeSuccessful();

            const incomingRequestStatusChangedEvent = await rRuntimeServices.eventBus.waitForEvent(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.Completed
            );
            expect(incomingRequestStatusChangedEvent.data.newStatus).toBe(LocalRequestStatus.Completed);

            const messageSentEvent = await rRuntimeServices.eventBus.waitForEvent(MessageSentEvent);
            expect(messageSentEvent.data.content["@type"]).toBe("ResponseWrapper");
        });

        test("processes the response", async () => {
            await expect(exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems)).resolves.not.toThrow();
        });
    });
});

describe("Handling the rejection and the revocation of a Relationship by the RequestModule", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();
    let sRuntimeServices: TestRuntimeServices;
    let rRuntimeServices: TestRuntimeServices;
    let tRuntimeServices: TestRuntimeServices;

    let createdRelationshipAttributeForFurtherSharing: LocalAttributeDTO;

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(3, { enableRequestModule: true, enableDeciderModule: true });

        sRuntimeServices = runtimeServices[0];
        rRuntimeServices = runtimeServices[1];
        tRuntimeServices = runtimeServices[2];

        await ensureActiveRelationship(sRuntimeServices.transport, tRuntimeServices.transport);
        createdRelationshipAttributeForFurtherSharing = await executeFullCreateAndShareRelationshipAttributeFlow(sRuntimeServices, tRuntimeServices, {
            content: {
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aStringValue",
                    title: "aTitle"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });
    }, 30000);

    afterEach(async () => {
        sRuntimeServices.eventBus.reset();
        rRuntimeServices.eventBus.reset();

        const rRepositoryAttributes = (await rRuntimeServices.consumption.attributes.getOwnIdentityAttributes({})).value;
        for (const rRepositoryAttribute of rRepositoryAttributes) {
            await rRuntimeServices.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: rRepositoryAttribute.id });
        }
    });

    afterAll(async () => await runtimeServiceProvider.stop());

    test("deletion of the Attributes shared between both Identities involved in the rejected Relationship and keeping the remaining Attributes", async () => {
        const sRelationship = await establishPendingRelationshipWithPredefinedRequestFlow(sRuntimeServices, rRuntimeServices, createdRelationshipAttributeForFurtherSharing);
        expect((await sRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(4);
        expect((await rRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(4);

        await sRuntimeServices.transport.relationships.rejectRelationship({ relationshipId: sRelationship.id });
        await sRuntimeServices.eventBus.waitForRunningEventHandlers();
        await syncUntilHasRelationships(rRuntimeServices.transport, 1);
        await rRuntimeServices.eventBus.waitForRunningEventHandlers();

        expect((await sRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await rRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(1);
    });

    test("deletion of the Attributes shared between both Identities involved in the revoked Relationship and keeping the remaining Attributes", async () => {
        const sRelationship = await establishPendingRelationshipWithPredefinedRequestFlow(sRuntimeServices, rRuntimeServices, createdRelationshipAttributeForFurtherSharing);
        expect((await sRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(4);
        expect((await rRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(4);

        await rRuntimeServices.transport.relationships.revokeRelationship({ relationshipId: sRelationship.id });
        await rRuntimeServices.eventBus.waitForRunningEventHandlers();
        await syncUntilHasRelationships(sRuntimeServices.transport, 1);
        await sRuntimeServices.eventBus.waitForRunningEventHandlers();

        expect((await rRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await sRuntimeServices.consumption.attributes.getAttributes({})).value).toHaveLength(1);
    });

    async function establishPendingRelationshipWithPredefinedRequestFlow(
        sRuntimeServices: TestRuntimeServices,
        rRuntimeServices: TestRuntimeServices,
        existingRelationshipAttributeForFurtherSharing: LocalAttributeDTO
    ): Promise<RelationshipDTO> {
        const sRelationship = await establishPendingRelationshipWithRequestFlow(
            sRuntimeServices,
            rRuntimeServices,
            [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        owner: ""
                    }).toJSON()
                },
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: RelationshipAttribute.from({
                        key: "aKey",
                        value: {
                            "@type": "ProprietaryString",
                            value: "aStringValue",
                            title: "aTitle"
                        },
                        owner: CoreAddress.from(""),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }).toJSON()
                },
                {
                    "@type": "ShareAttributeRequestItem",
                    mustBeAccepted: true,
                    sourceAttributeId: existingRelationshipAttributeForFurtherSharing.id,
                    attribute: existingRelationshipAttributeForFurtherSharing.content,
                    thirdPartyAddress: existingRelationshipAttributeForFurtherSharing.shareInfo?.peer
                }
            ],
            [{ accept: true }, { accept: true }, { accept: true }]
        );

        return sRelationship;
    }
});

describe("Handle Multiple RelationshipTemplate loadings", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();
    let sRuntimeServices: TestRuntimeServices;
    let rRuntimeServices: TestRuntimeServices;

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true });

        sRuntimeServices = runtimeServices[0];
        rRuntimeServices = runtimeServices[1];
    }, 30000);

    beforeEach(() => {
        sRuntimeServices.eventBus.reset();
        rRuntimeServices.eventBus.reset();
    });

    afterEach(() => {
        sRuntimeServices.eventBus.reset();
        rRuntimeServices.eventBus.reset();
    });

    afterAll(async () => await runtimeServiceProvider.stop());

    test("no multiple open Requests that lead to a Relationship can exist for the same Identity", async () => {
        const relationshipTemplateContent = RelationshipTemplateContent.from({
            onNewRelationship: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] }
        }).toJSON();

        const firstTemplate = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, relationshipTemplateContent);
        await rRuntimeServices.eventBus.waitForRunningEventHandlers();
        await expect(rRuntimeServices.eventBus).toHavePublished(
            RelationshipTemplateProcessedEvent,
            (e) => e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired
        );

        const requestForTemplate = (await rRuntimeServices.consumption.incomingRequests.getRequests({ query: { "source.reference": firstTemplate.id } })).value[0];

        rRuntimeServices.eventBus.reset();

        const secondTemplate = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, relationshipTemplateContent);
        await rRuntimeServices.eventBus.waitForRunningEventHandlers();

        await expect(rRuntimeServices.eventBus).not.toHavePublished(
            RelationshipTemplateProcessedEvent,
            (e) => e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired
        );

        await expect(rRuntimeServices.eventBus).toHavePublished(
            RelationshipTemplateProcessedEvent,
            (e) =>
                e.data.result === RelationshipTemplateProcessedResult.NonCompletedRequestExists &&
                e.data.template.id === secondTemplate.id &&
                e.data.requestId === requestForTemplate.id
        );
    });
});
