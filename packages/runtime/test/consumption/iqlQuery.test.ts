import { EventBus } from "@js-soft/ts-utils";
import { LocalRequestStatus } from "@nmshd/consumption";
import { IQLQueryJSON, ReadAttributeRequestItemJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { ConsumptionServices, CreateOutgoingRequestRequest, LocalAttributeDTO, OutgoingRequestCreatedEvent, OutgoingRequestStatusChangedEvent, TransportServices } from "../../src";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../../src/events";
import { establishRelationship, exchangeMessageWithRequest, RuntimeServiceProvider, sendMessageWithRequest, syncUntilHasMessageWithResponse, TestRuntimeServices } from "../lib";

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

    let rLocalAttribute: LocalAttributeDTO;
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

        const response = await rConsumptionServices.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "AGivenName1"
                },
                tags: ["language:de"]
            }
        });

        rLocalAttribute = response.value;

        await rConsumptionServices.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "AGivenName2"
                },
                tags: ["language:en"]
            }
        });

        await rConsumptionServices.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "AGivenName3"
                },
                tags: ["content:someContent"]
            }
        });

        requestForCreate = {
            content: {
                items: [
                    {
                        "@type": "ReadAttributeRequestItem",
                        mustBeAccepted: false,
                        query: {
                            "@type": "IQLQuery",
                            queryString: "#language:de"
                        }
                    }
                ],
                expiresAt: DateTime.now().plus({ hour: 1 }).toISO() as any
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

        const result = await sConsumptionServices.outgoingRequests.create(requestForCreate);

        expect(result).toBeSuccessful();

        const sLocalRequest = (await sConsumptionServices.outgoingRequests.getRequest({ id: result.value.id })).value;

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.id).toBe(sLocalRequest.id);

        expect(sLocalRequest.status).toBe(LocalRequestStatus.Draft);
        expect(sLocalRequest.content.items).toHaveLength(1);
        expect(sLocalRequest.content.items[0]["@type"]).toBe("ReadAttributeRequestItem");
        expect(sLocalRequest.content.items[0].mustBeAccepted).toBe(false);
    });

    // eslint-disable-next-line jest/expect-expect
    test("sender: send the outgoing IQL Request via Message", async () => {
        await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
    });

    test("sender: mark the outgoing IQL Request as sent", async () => {
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

    test("recipient: sync the Message with the IQL Request and create an incoming Request from the IQL Message content", async () => {
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

    test("recipient: check prerequisites of incoming IQL Request", async () => {
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

    test("recipient: require manual decision of incoming IQL Request", async () => {
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

    test("recipient: perform IQL Query to find attribute candidates", async () => {
        const request = (await exchangeMessageRequireManualDecision()).request;
        const requestItem: ReadAttributeRequestItemJSON = request.content.items[0] as ReadAttributeRequestItemJSON;

        const query: IQLQueryJSON = requestItem.query as IQLQueryJSON;

        const IQL_RESULT = await rConsumptionServices.attributes.executeIQLQuery({ query });

        expect(IQL_RESULT).toBeSuccessful();

        const rQueryResult = IQL_RESULT.value;

        expect(rQueryResult).toHaveLength(1);
    });

    test("recipient: call canAccept for incoming IQL Request", async () => {
        const rLocalRequest = (await exchangeMessageRequireManualDecision()).request;
        const result = await rConsumptionServices.incomingRequests.canAccept({
            requestId: rLocalRequest.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute.id
                }
            ] as any // bug in runtime
        });

        expect(result).toBeSuccessful();

        const resultValue = result.value;

        expect(resultValue.isSuccess).toBe(true);
    });

    test("recipient: accept incoming Request", async () => {
        const request = (await exchangeMessageRequireManualDecision()).request;
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.accept({
            requestId: request.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute.id
                }
            ] as any // bug in runtime
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
        const acceptedRequest = await rConsumptionServices.incomingRequests.accept({
            requestId: request.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute.id
                }
            ] as any // bug in runtime
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
                    accept: true,
                    existingAttributeId: rLocalAttribute.id
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
