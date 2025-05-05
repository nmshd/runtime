import { EventBus, sleep } from "@js-soft/ts-utils";
import { TestRequestItemJSON } from "@nmshd/consumption/test/modules/requests/testHelpers/TestRequestItem";
import { RelationshipCreationContentJSON, RelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { DateTime } from "luxon";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    LocalRequestStatus,
    OutgoingRequestCreatedEvent,
    OutgoingRequestStatusChangedEvent,
    TransportServices
} from "../../src";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../../src/events";
import {
    establishRelationship,
    exchangeMessageWithRequest,
    exchangeTemplate,
    RuntimeServiceProvider,
    sendMessageWithRequest,
    syncUntilHasRelationships,
    TestRuntimeServices
} from "../lib";
import {
    exchangeMessageWithRequestAndRequireManualDecision,
    exchangeMessageWithRequestAndSendResponse,
    exchangeTemplateAndReceiverRequiresManualDecision,
    exchangeTemplateAndReceiverSendsResponse
} from "../lib/testUtilsWithInactiveModules";

describe("Requests", () => {
    describe.each([
        {
            action: "Accept"
        },
        {
            action: "Reject"
        }
    ] as TestCase[])("Complete flow with Messages: $action Request", ({ action }) => {
        const actionLowerCase = action.toLowerCase() as "accept" | "reject";

        const runtimeServiceProvider = new RuntimeServiceProvider();
        let sRuntimeServices: TestRuntimeServices;
        let rRuntimeServices: TestRuntimeServices;
        let sConsumptionServices: ConsumptionServices;
        let rConsumptionServices: ConsumptionServices;
        let sTransportServices: TransportServices;
        let rTransportServices: TransportServices;
        let sEventBus: EventBus;
        let rEventBus: EventBus;

        let requestContent: CreateOutgoingRequestRequest;

        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2);
            sRuntimeServices = runtimeServices[0];
            rRuntimeServices = runtimeServices[1];
            sTransportServices = sRuntimeServices.transport;
            rTransportServices = rRuntimeServices.transport;
            sConsumptionServices = sRuntimeServices.consumption;
            rConsumptionServices = rRuntimeServices.consumption;
            sEventBus = sRuntimeServices.eventBus;
            rEventBus = rRuntimeServices.eventBus;

            await establishRelationship(sTransportServices, rTransportServices);

            requestContent = {
                content: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        }
                    ],
                    expiresAt: CoreDate.utc().add({ minute: 10 }).toISOString()
                },
                peer: (await rTransportServices.account.getIdentityInfo()).value.address
            };
        }, 30000);
        afterAll(async () => await runtimeServiceProvider.stop());

        test("sender: create an outgoing Request in status Draft", async () => {
            let triggeredEvent: OutgoingRequestCreatedEvent | undefined;
            sEventBus.subscribeOnce(OutgoingRequestCreatedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await sConsumptionServices.outgoingRequests.create(requestContent);

            expect(result).toBeSuccessful();

            const sLocalRequest = (await sConsumptionServices.outgoingRequests.getRequest({ id: result.value.id })).value;

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.id).toBe(sLocalRequest.id);

            expect(sLocalRequest.status).toBe(LocalRequestStatus.Draft);
            expect(sLocalRequest.content.items).toHaveLength(1);
            expect(sLocalRequest.content.items[0]["@type"]).toBe("TestRequestItem");
            expect((sLocalRequest.content.items[0] as TestRequestItemJSON).mustBeAccepted).toBe(false);
        });

        test("sender: send the outgoing Request via Message", async () => {
            const promise = sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            await expect(promise).resolves.not.toThrow();
        });

        test("sender: mark the outgoing Request as sent", async () => {
            let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
            sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });
            const sRequestMessage = await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            const result = await sConsumptionServices.outgoingRequests.sent({ requestId: sRequestMessage.content.id!, messageId: sRequestMessage.id });

            expect(result).toBeSuccessful();
            expect(result.value.status).toBe(LocalRequestStatus.Open);
            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.request.id).toBe(result.value.id);
        });

        test("recipient: sync the Message with the Request and create an incoming Request from the Message content", async () => {
            let triggeredEvent: IncomingRequestReceivedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestReceivedEvent, (event) => {
                triggeredEvent = event;
            });

            const rRequestMessage = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            const result = await rConsumptionServices.incomingRequests.received({
                receivedRequest: rRequestMessage.content,
                requestSourceId: rRequestMessage.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: result.value.id })).value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Open);
            expect(rLocalRequest.id).toBe(rRequestMessage.content.id!);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.id).toBe(result.value.id);
        });

        test("recipient: check prerequisites of incoming Request", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            await rConsumptionServices.incomingRequests.received({
                receivedRequest: message.content,
                requestSourceId: message.id
            });
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: message.content.id!
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.DecisionRequired);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Open);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);
        });

        test("recipient: require manual decision of incoming Request", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
            await rConsumptionServices.incomingRequests.received({
                receivedRequest: message.content,
                requestSourceId: message.id
            });
            await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: message.content.id!
            });
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.requireManualDecision({
                requestId: message.content.id!
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.ManualDecisionRequired);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.DecisionRequired);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.ManualDecisionRequired);
        });

        test(`recipient: call can${action} for incoming Request`, async () => {
            const rLocalRequest = (await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent)).request;
            const result = await rConsumptionServices.incomingRequests[`can${action}`]({
                requestId: rLocalRequest.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });

            expect(result).toBeSuccessful();

            const resultValue = result.value;

            expect(resultValue.isSuccess).toBe(true);
            expect(resultValue.items).toHaveLength(1);
            expect(resultValue.items[0].isSuccess).toBe(true);
            expect(resultValue.items[0].items).toHaveLength(0);
        });

        test(`recipient: ${actionLowerCase} incoming Request`, async () => {
            const request = (await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent)).request;
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests[actionLowerCase]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });
            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Decided);
            expect(rLocalRequest.response).toBeDefined();
            expect(rLocalRequest.response!.content).toBeDefined();

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.ManualDecisionRequired);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Decided);
        });

        test("recipient: send Response via Message", async () => {
            const { request, source } = await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent);
            const acceptedRequest = await rConsumptionServices.incomingRequests[actionLowerCase]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });
            const result = await rTransportServices.messages.sendMessage({
                content: {
                    "@type": "ResponseWrapper",
                    requestId: request.id,
                    requestSourceReference: source,
                    requestSourceType: "Message",
                    response: acceptedRequest.value.response!.content
                },
                recipients: [(await sTransportServices.account.getIdentityInfo()).value.address]
            });

            expect(result).toBeSuccessful();

            const rResponseMessage = result.value;

            expect(rResponseMessage.content["@type"]).toBe("ResponseWrapper");
        });

        test("recipient: complete incoming Request", async () => {
            const rResponseMessage = (await exchangeMessageWithRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestContent, action)).rResponseMessage;
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.complete({
                requestId: rResponseMessage.content.requestId,
                responseSourceId: rResponseMessage.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Completed);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Decided);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Completed);
        });

        test("sender: sync Message with Response and complete the outgoing Request with Response from Message", async () => {
            const sResponseMessage = (await exchangeMessageWithRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestContent, action)).sResponseMessage;

            let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
            sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await sConsumptionServices.outgoingRequests.complete({
                messageId: sResponseMessage.id,
                receivedResponse: sResponseMessage.content.response
            });

            expect(result).toBeSuccessful();

            const sLocalRequest = result.value;

            expect(sLocalRequest).toBeDefined();
            expect(sLocalRequest.status).toBe(LocalRequestStatus.Completed);
            expect(sLocalRequest.response).toBeDefined();
            expect(sLocalRequest.response!.content).toBeDefined();

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Open);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Completed);
        });
    });

    describe.each([
        {
            action: "Accept"
        },
        {
            action: "Reject"
        }
    ] as TestCase[])("Complete flow with Relationship Template and Change: $action Request", ({ action }) => {
        const actionLowerCase = action.toLowerCase() as "accept" | "reject";

        const runtimeServiceProvider = new RuntimeServiceProvider();
        let sRuntimeServices: TestRuntimeServices;
        let rRuntimeServices: TestRuntimeServices;
        let sConsumptionServices: ConsumptionServices;
        let rConsumptionServices: ConsumptionServices;
        let sTransportServices: TransportServices;
        let rTransportServices: TransportServices;
        let rEventBus: EventBus;

        const templateContent: RelationshipTemplateContentJSON = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ],
                expiresAt: CoreDate.utc().add({ minute: 10 }).toISOString()
            }
        };

        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2);
            sRuntimeServices = runtimeServices[0];
            rRuntimeServices = runtimeServices[1];
            sTransportServices = sRuntimeServices.transport;
            rTransportServices = rRuntimeServices.transport;
            sConsumptionServices = sRuntimeServices.consumption;
            rConsumptionServices = rRuntimeServices.consumption;
            rEventBus = rRuntimeServices.eventBus;
        }, 30000);
        afterAll(async () => await runtimeServiceProvider.stop());

        test("sender: create a Relationship Template with the Request", async () => {
            const result = await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content: templateContent,
                expiresAt: CoreDate.utc().add({ minute: 10 }).toISOString()
            });

            expect(result).toBeSuccessful();
        });

        test("recipient: load the Relationship Template with the Request", async () => {
            await expect(exchangeTemplate(sTransportServices, rTransportServices, templateContent)).resolves.not.toThrow();
        });

        test("recipient: create an incoming Request from the Relationship Template content", async () => {
            const rRelationshipTemplate = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
            let triggeredEvent: IncomingRequestReceivedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestReceivedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.received({
                receivedRequest: (rRelationshipTemplate.content as RelationshipTemplateContentJSON).onNewRelationship,
                requestSourceId: rRelationshipTemplate.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: result.value.id })).value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Open);
            expect(rLocalRequest.id).toBeDefined();

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.id).toBe(result.value.id);
        });

        test("recipient: check prerequisites of incoming Request", async () => {
            const rRelationshipTemplate = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
            const incomingRequest = (
                await rConsumptionServices.incomingRequests.received({
                    receivedRequest: (rRelationshipTemplate.content as RelationshipTemplateContentJSON).onNewRelationship,
                    requestSourceId: rRelationshipTemplate.id
                })
            ).value;
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: incomingRequest.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.DecisionRequired);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Open);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);
        });

        test("recipient: require manual decision of incoming Request", async () => {
            const rRelationshipTemplate = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
            const incomingRequest = (
                await rConsumptionServices.incomingRequests.received({
                    receivedRequest: (rRelationshipTemplate.content as RelationshipTemplateContentJSON).onNewRelationship,
                    requestSourceId: rRelationshipTemplate.id
                })
            ).value;
            await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: incomingRequest.id
            });

            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.requireManualDecision({
                requestId: incomingRequest.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.ManualDecisionRequired);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.DecisionRequired);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.ManualDecisionRequired);
        });

        test(`recipient: call can${action} for incoming Request`, async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent)).request;
            const result = await rConsumptionServices.incomingRequests[`can${action}`]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });

            expect(result).toBeSuccessful();

            const resultValue = result.value;

            expect(resultValue.isSuccess).toBe(true);
            expect(resultValue.items).toHaveLength(1);
            expect(resultValue.items[0].isSuccess).toBe(true);
            expect(resultValue.items[0].items).toHaveLength(0);
        });

        test(`recipient: ${actionLowerCase} incoming Request`, async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent)).request;
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests[actionLowerCase]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Decided);
            expect(rLocalRequest.response).toBeDefined();
            expect(rLocalRequest.response!.content).toBeDefined();

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.ManualDecisionRequired);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Decided);
        });

        test("recipient: complete incoming Request", async () => {
            const { request, relationship } = await exchangeTemplateAndReceiverSendsResponse(sRuntimeServices, rRuntimeServices, templateContent, actionLowerCase);
            await rConsumptionServices.incomingRequests[actionLowerCase]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ]
            });

            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.complete({
                requestId: request.id,
                responseSourceId: action === "Accept" ? relationship?.id : undefined
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = result.value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Completed);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Decided);
            expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Completed);
            // in case of a reject no relationship was created
            if (action === "Reject") return;

            const syncResult = await syncUntilHasRelationships(sTransportServices);

            expect(syncResult).toHaveLength(1);

            const sRelationship = syncResult[0];

            const completionResult = await sConsumptionServices.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
                responseSourceId: sRelationship.id,
                response: (sRelationship.creationContent as RelationshipCreationContentJSON).response,
                templateId: relationship!.templateId
            });

            expect(completionResult).toBeSuccessful();

            const sLocalRequest = (await sConsumptionServices.outgoingRequests.getRequest({ id: result.value.id })).value;

            expect(sLocalRequest).toBeDefined();
            expect(sLocalRequest.id).toBe(rLocalRequest.id);
            expect(sLocalRequest.status).toBe(LocalRequestStatus.Completed);
            expect(sLocalRequest.response).toBeDefined();
            expect(sLocalRequest.response!.content).toBeDefined();

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
        });
    });

    describe("Request expired due to expired RelationshipTemplate", () => {
        const runtimeServiceProvider = new RuntimeServiceProvider();
        let sRuntimeServices: TestRuntimeServices;
        let rRuntimeServices: TestRuntimeServices;
        let rConsumptionServices: ConsumptionServices;
        let rEventBus: EventBus;

        const templateContent = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            }
        };

        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2);
            sRuntimeServices = runtimeServices[0];
            rRuntimeServices = runtimeServices[1];
            rConsumptionServices = rRuntimeServices.consumption;
            rEventBus = rRuntimeServices.eventBus;
        }, 30000);

        afterAll(async () => await runtimeServiceProvider.stop());

        test("change status of Request when querying it if the underlying RelationshipTemplate is expired", async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent, DateTime.utc().plus({ seconds: 3 })))
                .request;

            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            expect(request.status).not.toBe(LocalRequestStatus.Expired);

            await sleep(3000);

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: request.id })).value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Expired);
            expect(rLocalRequest.response).toBeUndefined();

            expect(triggeredEvent).toBeUndefined();
        });

        test("change status of Request when querying Requests if the underlying RelationshipTemplate is expired", async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent, DateTime.utc().plus({ seconds: 3 })))
                .request;

            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            expect(request.status).not.toBe(LocalRequestStatus.Expired);

            await sleep(3000);

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequests({})).value[0];

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Expired);
            expect(rLocalRequest.response).toBeUndefined();

            expect(triggeredEvent).toBeUndefined();
        });

        test("can not delete a Request when it is not expired", async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent)).request;

            await expect(rConsumptionServices.incomingRequests.delete({ requestId: request.id })).resolves.toBeAnError(
                "is in status 'ManualDecisionRequired'. At the moment, you can only delete incoming Requests that are expired.",
                "error.consumption.requests.canOnlyDeleteIncomingRequestThatIsExpired"
            );
        });

        test("can delete a Request when it is expired", async () => {
            const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent, DateTime.utc().plus({ seconds: 3 })))
                .request;

            await sleep(3000);

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: request.id })).value;
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Expired);

            await expect(rConsumptionServices.incomingRequests.delete({ requestId: request.id })).resolves.toBeSuccessful();

            const rLocalRequestAfterDelete = await rConsumptionServices.incomingRequests.getRequest({ id: request.id });
            expect(rLocalRequestAfterDelete).toBeAnError("LocalRequest not found.", "error.runtime.recordNotFound");
        });

        describe.each([
            {
                action: "Accept"
            },
            {
                action: "Reject"
            }
        ] as TestCase[])("Cannot respond to Request of expired RelationshipTemplate: $action Request throws error", ({ action }) => {
            const actionLowerCase = action.toLowerCase() as "accept" | "reject";

            test(`recipient: cannot ${actionLowerCase} incoming Request`, async () => {
                const request = (await exchangeTemplateAndReceiverRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent, DateTime.utc().plus({ seconds: 3 })))
                    .request;

                let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
                rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                    triggeredEvent = event;
                });

                await sleep(3000);

                const result = await rConsumptionServices.incomingRequests[actionLowerCase]({
                    requestId: request.id,
                    items: [
                        {
                            accept: action === "Accept"
                        }
                    ]
                });

                expect(result).toBeAnError("Local Request has to be in status 'DecisionRequired/ManualDecisionRequired", "error.runtime.unknown");

                const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: request.id })).value;

                expect(rLocalRequest).toBeDefined();
                expect(rLocalRequest.status).toBe(LocalRequestStatus.Expired);
                expect(rLocalRequest.response).toBeUndefined();

                expect(triggeredEvent).toBeUndefined();
            });
        });
    });
});

interface TestCase {
    action: "Accept" | "Reject";
}
