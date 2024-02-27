import { EventBus } from "@js-soft/ts-utils";
import { LocalRequestStatus } from "@nmshd/consumption";
import { IResponse, RelationshipCreationChangeRequestContent, RelationshipCreationChangeRequestContentJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/transport";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    OutgoingRequestCreatedEvent,
    OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent,
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
    syncUntilHasMessageWithResponse,
    syncUntilHasRelationships,
    TestRuntimeServices
} from "../lib";

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

        let requestForCreate: CreateOutgoingRequestRequest;

        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2);
            sRuntimeServices = runtimeServices[0];
            rRuntimeServices = runtimeServices[1];
            sConsumptionServices = runtimeServices[0].consumption;
            sTransportServices = runtimeServices[0].transport;
            sEventBus = runtimeServices[0].eventBus;
            rConsumptionServices = runtimeServices[1].consumption;
            rTransportServices = runtimeServices[1].transport;
            rEventBus = runtimeServices[1].eventBus;

            await establishRelationship(sTransportServices, rTransportServices);

            requestForCreate = {
                content: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        }
                    ],
                    expiresAt: CoreDate.utc().add({ hour: 1 }).toISOString()
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

            const result = await sConsumptionServices.outgoingRequests.create(requestForCreate);

            expect(result).toBeSuccessful();

            const sLocalRequest = (await sConsumptionServices.outgoingRequests.getRequest({ id: result.value.id })).value;

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.id).toBe(sLocalRequest.id);

            expect(sLocalRequest.status).toBe(LocalRequestStatus.Draft);
            expect(sLocalRequest.content.items).toHaveLength(1);
            expect(sLocalRequest.content.items[0]["@type"]).toBe("TestRequestItem");
            expect(sLocalRequest.content.items[0].mustBeAccepted).toBe(false);
        });

        // eslint-disable-next-line jest/expect-expect
        test("sender: send the outgoing Request via Message", async () => {
            await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
        });

        test("sender: mark the outgoing Request as sent", async () => {
            let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
            sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });
            const sRequestMessage = await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
            const result = await sConsumptionServices.outgoingRequests.sent({ requestId: sRequestMessage.content.id, messageId: sRequestMessage.id });

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

            const rRequestMessage = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
            const result = await rConsumptionServices.incomingRequests.received({
                receivedRequest: rRequestMessage.content,
                requestSourceId: rRequestMessage.id
            });

            expect(result).toBeSuccessful();

            const rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: result.value.id })).value;

            expect(rLocalRequest).toBeDefined();
            expect(rLocalRequest.status).toBe(LocalRequestStatus.Open);
            expect(rLocalRequest.id).toBe(rRequestMessage.content.id);

            expect(triggeredEvent).toBeDefined();
            expect(triggeredEvent!.data).toBeDefined();
            expect(triggeredEvent!.data.id).toBe(result.value.id);
        });

        test("recipient: check prerequisites of incoming Request", async () => {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
            await rConsumptionServices.incomingRequests.received({
                receivedRequest: message.content,
                requestSourceId: message.id
            });
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: message.content.id
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
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
            await rConsumptionServices.incomingRequests.received({
                receivedRequest: message.content,
                requestSourceId: message.id
            });
            await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: message.content.id
            });
            let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.requireManualDecision({
                requestId: message.content.id
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
            const rLocalRequest = (await exchangeMessageRequireManualDecision()).request;
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
            const request = (await exchangeMessageRequireManualDecision()).request;
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
            const { request, source } = await exchangeMessageRequireManualDecision();
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
            const rResponseMessage = (await exchangeMessageSendResponse()).rResponseMessage;
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
            const sResponseMessage = (await exchangeMessageSendResponse()).sResponseMessage;

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

        async function exchangeMessageRequireManualDecision() {
            const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
            await sConsumptionServices.outgoingRequests.sent({ requestId: message.content.id, messageId: message.id });

            await rConsumptionServices.incomingRequests.received({
                receivedRequest: message.content,
                requestSourceId: message.id
            });
            await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: message.content.id
            });
            return {
                request: (
                    await rConsumptionServices.incomingRequests.requireManualDecision({
                        requestId: message.content.id
                    })
                ).value,
                source: message.id
            };
        }

        async function exchangeMessageSendResponse() {
            const { request, source } = await exchangeMessageRequireManualDecision();
            const acceptedRequest = await rConsumptionServices.incomingRequests.accept({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept"
                    }
                ] as any // bug in runtime
            });

            const rResponseMessage = (
                await rTransportServices.messages.sendMessage({
                    content: {
                        "@type": "ResponseWrapper",
                        requestId: request.id,
                        requestSourceReference: source,
                        requestSourceType: "Message",
                        response: acceptedRequest.value.response!.content
                    },
                    recipients: [(await sTransportServices.account.getIdentityInfo()).value.address]
                })
            ).value;
            const sResponseMessage = await syncUntilHasMessageWithResponse(sTransportServices, request.id);
            return { rResponseMessage, sResponseMessage };
        }
    });

    describe.only.each([
        {
            action: "Accept"
        },
        {
            action: "Reject"
        }
    ] as TestCase[])("Complete flow with Relationship Template and Change: $action Request", ({ action }) => {
        const actionLowerCase = action.toLowerCase() as "accept" | "reject";

        const runtimeServiceProvider = new RuntimeServiceProvider();
        let sConsumptionServices: ConsumptionServices;
        let rConsumptionServices: ConsumptionServices;
        let sTransportServices: TransportServices;
        let rTransportServices: TransportServices;
        let rEventBus: EventBus;
        let sEventBus: EventBus;

        const templateContent = {
            content: {
                "@type": "RelationshipTemplateContent",
                onNewRelationship: {
                    "@type": "Request",
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        }
                    ],
                    expiresAt: CoreDate.utc().add({ hour: 1 }).toISOString()
                }
            },
            expiresAt: CoreDate.utc().add({ hour: 1 }).toISOString()
        };
        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(2);
            sConsumptionServices = runtimeServices[0].consumption;
            sTransportServices = runtimeServices[0].transport;
            sEventBus = runtimeServices[0].eventBus;
            rConsumptionServices = runtimeServices[1].consumption;
            rTransportServices = runtimeServices[1].transport;
            rEventBus = runtimeServices[1].eventBus;
        }, 30000);
        afterAll(async () => await runtimeServiceProvider.stop());

        test("sender: create a Relationship Template with the Request", async () => {
            const result = await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate(templateContent);

            expect(result).toBeSuccessful();
        });

        // eslint-disable-next-line jest/expect-expect
        test("recipient: load the Relationship Template with the Request", async () => {
            await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
        });

        test("recipient: create an incoming Request from the Relationship Template content", async () => {
            const rRelationshipTemplate = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);
            let triggeredEvent: IncomingRequestReceivedEvent | undefined;
            rEventBus.subscribeOnce(IncomingRequestReceivedEvent, (event) => {
                triggeredEvent = event;
            });

            const result = await rConsumptionServices.incomingRequests.received({
                receivedRequest: rRelationshipTemplate.content.content.onNewRelationship,
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
                    receivedRequest: rRelationshipTemplate.content.content.onNewRelationship,
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
                    receivedRequest: rRelationshipTemplate.content.content.onNewRelationship,
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
            const request = (await exchangeTemplateRequireManualDecision()).request;
            const result = await rConsumptionServices.incomingRequests[`can${action}`]({
                requestId: request.id,
                items: [
                    {
                        accept: action === "Accept" ? true : false // eslint-disable-line jest/no-if
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
            const request = (await exchangeTemplateRequireManualDecision()).request;
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

        test.only("recipient: complete incoming Request", async () => {
            const { request, relationship } = await exchangeTemplateSendResponse();
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
                responseSourceId: action === "Accept" ? relationship?.changes[0].id : undefined
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

            const sRelationshipChange = syncResult[0].changes[0];

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let triggeredCompletionEvent: OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent | undefined;
            sEventBus.subscribeOnce(OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent, (event) => {
                triggeredCompletionEvent = event;
            });

            const completionResult = await sConsumptionServices.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
                responseSourceId: sRelationshipChange.id,
                response: (sRelationshipChange.request.content as RelationshipCreationChangeRequestContentJSON).response,
                templateId: relationship!.template.id
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

        async function exchangeTemplateRequireManualDecision() {
            const template = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

            const request = (
                await rConsumptionServices.incomingRequests.received({
                    receivedRequest: template.content.content.onNewRelationship,
                    requestSourceId: template.id
                })
            ).value;
            await rConsumptionServices.incomingRequests.checkPrerequisites({
                requestId: request.id
            });
            return {
                request: (
                    await rConsumptionServices.incomingRequests.requireManualDecision({
                        requestId: request.id
                    })
                ).value,
                templateId: template.id
            };
        }

        async function exchangeTemplateSendResponse() {
            const { request, templateId } = await exchangeTemplateRequireManualDecision();
            const decidedRequest = (
                await rConsumptionServices.incomingRequests[actionLowerCase]({
                    requestId: request.id,
                    items: [
                        {
                            accept: action === "Accept"
                        }
                    ]
                })
            ).value;

            let relationship;
            if (action === "Accept") {
                const content = RelationshipCreationChangeRequestContent.from({ response: decidedRequest.response!.content as unknown as IResponse });
                const result = await rTransportServices.relationships.createRelationship({ content, templateId });

                expect(result).toBeSuccessful();

                relationship = result.value;

                const rRelationshipChange = result.value.changes[0];

                expect(rRelationshipChange.request.content["@type"]).toBe("RelationshipCreationChangeRequestContent");
            }
            return { request, relationship };
            // return (await rConsumptionServices.incomingRequests.complete({
            //     requestId: rLocalRequest.id,
            //     responseSourceId: action === "Accept" ? relationship?.changes[0].id : undefined
            // })).value;
        }
    });
});

interface TestCase {
    action: "Accept" | "Reject";
}
