import { EventBus } from "@js-soft/ts-utils";
import { IQLQueryJSON, ReadAttributeRequestItemJSON } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    LocalAttributeDTO,
    LocalRequestStatus,
    OutgoingRequestCreatedEvent,
    OutgoingRequestStatusChangedEvent,
    TransportServices
} from "@nmshd/runtime";
import { DateTime } from "luxon";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../../src/events/index.js";
import { RuntimeServiceProvider, TestRuntimeServices, establishRelationship, exchangeMessageWithRequest, sendMessageWithRequest } from "../lib/index.js";
import { exchangeMessageWithRequestAndRequireManualDecision, exchangeMessageWithRequestAndSendResponse } from "../lib/testUtilsWithInactiveModules.js";

describe("IQL Query", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();

    let sRuntimeServices: TestRuntimeServices;
    let rRuntimeServices: TestRuntimeServices;
    let sConsumptionServices: ConsumptionServices;
    let rConsumptionServices: ConsumptionServices;
    let sTransportServices: TransportServices;
    let rTransportServices: TransportServices;
    let sEventBus: EventBus;
    let rEventBus: EventBus;

    let rLocalAttribute1: LocalAttributeDTO;
    let rLocalAttribute2: LocalAttributeDTO;
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

        rLocalAttribute1 = (
            await rConsumptionServices.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName1"
                    },
                    tags: ["x:language:de"]
                }
            })
        ).value;

        rLocalAttribute2 = (
            await rConsumptionServices.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName2"
                    },
                    tags: ["x:language:en"]
                }
            })
        ).value;

        await rConsumptionServices.attributes.createOwnIdentityAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName3"
                },
                tags: ["x:content:someContent"]
            }
        });

        requestContent = {
            content: {
                items: [
                    {
                        "@type": "ReadAttributeRequestItem",
                        mustBeAccepted: false,
                        query: {
                            "@type": "IQLQuery",
                            queryString: "#x:language:de"
                        }
                    }
                ],
                expiresAt: DateTime.now().plus({ hour: 1 }).toISO()
            },
            peer: (await rTransportServices.account.getIdentityInfo()).value.address
        };
    }, 30000);
    afterAll(async () => {
        await runtimeServiceProvider.stop();
    });

    test("sender: create an outgoing IQL Request in status Draft", async () => {
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
        expect(sLocalRequest.content.items[0]["@type"]).toBe("ReadAttributeRequestItem");
        expect((sLocalRequest.content.items[0] as ReadAttributeRequestItemJSON).mustBeAccepted).toBe(false);
    });

    test("sender: send the outgoing IQL Request via Message", async () => {
        await expect(sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent)).resolves.not.toThrow();
    });

    test("sender: mark the outgoing IQL Request as sent", async () => {
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

    test("recipient: sync the Message with the IQL Request and create an incoming Request from the IQL Message content", async () => {
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
        expect(rLocalRequest.id).toBe(rRequestMessage.content.id);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.id).toBe(result.value.id);
    });

    test("recipient: check prerequisites of incoming IQL Request", async () => {
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

    test("recipient: require manual decision of incoming IQL Request", async () => {
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

    test("recipient: perform IQL Query to find attribute candidates", async () => {
        const request = (await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent)).request;
        const requestItem: ReadAttributeRequestItemJSON = request.content.items[0] as ReadAttributeRequestItemJSON;

        const query: IQLQueryJSON = requestItem.query as IQLQueryJSON;

        const IQL_RESULT = await rConsumptionServices.attributes.executeIQLQuery({ query });

        expect(IQL_RESULT).toBeSuccessful();

        const rQueryResult = IQL_RESULT.value;

        expect(rQueryResult).toHaveLength(1);
    });

    test("recipient: call canAccept for incoming IQL Request", async () => {
        const rLocalRequest = (await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent)).request;
        const result = await rConsumptionServices.incomingRequests.canAccept({
            requestId: rLocalRequest.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute1.id
                }
            ] as any // bug in Runtime
        });

        expect(result).toBeSuccessful();

        const resultValue = result.value;

        expect(resultValue.isSuccess).toBe(true);
    });

    test("recipient: accept incoming Request", async () => {
        const request = (await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestContent)).request;
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.accept({
            requestId: request.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute1.id
                }
            ] as any // bug in Runtime
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
        const acceptedRequest = await rConsumptionServices.incomingRequests.accept({
            requestId: request.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute2.id
                }
            ] as any // bug in Runtime
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
        const rResponseMessage = (await exchangeMessageWithRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestContent, "accept")).rResponseMessage;

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
        const sResponseMessage = (await exchangeMessageWithRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestContent, "accept")).sResponseMessage;

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
