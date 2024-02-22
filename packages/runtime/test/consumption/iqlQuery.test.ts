import { EventBus } from "@js-soft/ts-utils";
import { DecideRequestItemGroupParametersJSON, DecideRequestItemParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import { IQLQueryJSON, ReadAttributeRequestItemJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    LocalAttributeDTO,
    LocalRequestDTO,
    MessageDTO,
    OutgoingRequestCreatedEvent,
    OutgoingRequestStatusChangedEvent,
    TransportServices
} from "../../src";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../../src/events";
import {
    createAndSendRequest,
    createAndSendRequestSendResponseAndSync,
    createRequest,
    createSendAndAcceptRequestAndSendResponse,
    createSendAndMarkAsSentRequest,
    createSendAndSyncRequest,
    createSendSyncAndCheckRequest,
    createSendSyncRequestAndRequireManualDecision,
    establishRelationship,
    RuntimeServiceProvider,
    TestRuntimeServices
} from "../lib";

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

    let sLocalRequest: LocalRequestDTO;
    let sRequestMessage: MessageDTO;
    let rRequestMessage: MessageDTO;
    let rLocalRequest: LocalRequestDTO;
    let rResponseMessage: MessageDTO;
    let sResponseMessage: MessageDTO;

    let rLocalAttribute: LocalAttributeDTO;
    let rQueryResult: LocalAttributeDTO[];
    let requestForCreate: CreateOutgoingRequestRequest;
    let responseForCreate: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];

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

        responseForCreate = [
            Object.assign(
                {
                    accept: true
                },
                {
                    existingAttributeId: rLocalAttribute.id
                }
            )
        ];
    }, 30000);
    afterAll(async () => {
        await runtimeServiceProvider.stop();
    });

    test("sender: create an outgoing IQL Request in status Draft", async () => {
        let triggeredEvent: OutgoingRequestCreatedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestCreatedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await createRequest(sRuntimeServices, requestForCreate);

        expect(result).toBeSuccessful();

        sLocalRequest = (await sConsumptionServices.outgoingRequests.getRequest({ id: result.value.id })).value;

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.id).toBe(sLocalRequest.id);

        expect(sLocalRequest.status).toBe(LocalRequestStatus.Draft);
        expect(sLocalRequest.content.items).toHaveLength(1);
        expect(sLocalRequest.content.items[0]["@type"]).toBe("ReadAttributeRequestItem");
        expect(sLocalRequest.content.items[0].mustBeAccepted).toBe(false);
    });

    test("sender: send the outgoing IQL Request via Message", async () => {
        const result = await createAndSendRequest(sRuntimeServices, rRuntimeServices, requestForCreate);

        expect(result).toBeSuccessful();

        sRequestMessage = result.value;
    });

    test("sender: mark the outgoing IQL Request as sent", async () => {
        let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });
        const result = await createSendAndMarkAsSentRequest(sRuntimeServices, rRuntimeServices, requestForCreate);

        expect(result).toBeSuccessful();

        sLocalRequest = result.value;

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

        rRequestMessage = await createSendAndSyncRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
        const result = await rConsumptionServices.incomingRequests.received({
            receivedRequest: rRequestMessage.content,
            requestSourceId: rRequestMessage.id
        });

        expect(result).toBeSuccessful();

        rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: result.value.id })).value;

        expect(rLocalRequest).toBeDefined();
        expect(rLocalRequest.status).toBe(LocalRequestStatus.Open);
        expect(rLocalRequest.id).toBe(rRequestMessage.content.id);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.id).toBe(result.value.id);
    });

    test("recipient: check prerequisites of incoming IQL Request", async () => {
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await createSendSyncAndCheckRequest(sRuntimeServices, rRuntimeServices, requestForCreate);

        expect(result).toBeSuccessful();

        rLocalRequest = result.value;

        expect(rLocalRequest).toBeDefined();
        expect(rLocalRequest.status).toBe(LocalRequestStatus.DecisionRequired);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Open);
        expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.DecisionRequired);
    });

    test("recipient: require manual decision of incoming IQL Request", async () => {
        const sentRequest = (await createSendSyncAndCheckRequest(sRuntimeServices, rRuntimeServices, requestForCreate)).value;

        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.requireManualDecision({
            requestId: sentRequest.id
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
        const rLocalRequest = (await createSendSyncRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestForCreate)).value;

        const requestItem: ReadAttributeRequestItemJSON = rLocalRequest.content.items[0] as ReadAttributeRequestItemJSON;

        const query: IQLQueryJSON = requestItem.query as IQLQueryJSON;

        const IQL_RESULT = await rConsumptionServices.attributes.executeIQLQuery({ query });

        expect(IQL_RESULT).toBeSuccessful();

        rQueryResult = IQL_RESULT.value;

        expect(rQueryResult).toHaveLength(1);
    });

    test("recipient: call canAccept for incoming IQL Request", async () => {
        const rLocalRequest = (await createSendSyncRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestForCreate)).value;

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
        const oldLocalRequest = (await createSendSyncRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestForCreate)).value;

        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.accept({
            requestId: oldLocalRequest.id,
            items: [
                {
                    accept: true,
                    existingAttributeId: rLocalAttribute.id
                }
            ] as any // bug in runtime
        });
        expect(result).toBeSuccessful();

        rLocalRequest = result.value;

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
        const result = await createSendAndAcceptRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestForCreate, responseForCreate);

        expect(result).toBeSuccessful();

        rResponseMessage = result.value;

        expect(rResponseMessage.content["@type"]).toBe("ResponseWrapper");
    });

    test("recipient: complete incoming Request", async () => {
        const rResponseMessage = (await createSendAndAcceptRequestAndSendResponse(sRuntimeServices, rRuntimeServices, requestForCreate, responseForCreate)).value;

        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.complete({
            requestId: rResponseMessage.content.requestId,
            responseSourceId: rResponseMessage.id
        });

        expect(result).toBeSuccessful();

        rLocalRequest = result.value;

        expect(rLocalRequest).toBeDefined();
        expect(rLocalRequest.status).toBe(LocalRequestStatus.Completed);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.Decided);
        expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.Completed);
    });

    test("sender: sync Message with Response and complete the outgoing Request with Response from Message", async () => {
        sResponseMessage = await createAndSendRequestSendResponseAndSync(sRuntimeServices, rRuntimeServices, requestForCreate, responseForCreate);

        let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await sConsumptionServices.outgoingRequests.complete({
            messageId: sResponseMessage.id,
            receivedResponse: sResponseMessage.content.response
        });

        expect(result).toBeSuccessful();

        sLocalRequest = result.value;

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
