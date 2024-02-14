import { EventBus } from "@js-soft/ts-utils";
import { LocalRequestStatus } from "@nmshd/consumption";
import { IQLQueryJSON, ReadAttributeRequestItemJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { ConsumptionServices, LocalAttributeDTO, LocalRequestDTO, MessageDTO, OutgoingRequestCreatedEvent, OutgoingRequestStatusChangedEvent, TransportServices } from "../../src";
import { IncomingRequestReceivedEvent, IncomingRequestStatusChangedEvent } from "../../src/events";
import { establishRelationship, RuntimeServiceProvider, syncUntilHasMessageWithRequest, syncUntilHasMessageWithResponse } from "../lib";

/* Disable timeout errors if we're debugging */
if (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS.search("inspect") !== -1) {
    jest.setTimeout(1e9);
}

describe("IQL Query", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();
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

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(2);
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
    }, 30000);
    afterAll(async () => {
        await runtimeServiceProvider.stop();
    });

    test("sender: create an outgoing IQL Request in status Draft", async () => {
        let triggeredEvent: OutgoingRequestCreatedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestCreatedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await sConsumptionServices.outgoingRequests.create({
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
        });

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
        const result = await sTransportServices.messages.sendMessage({
            content: sLocalRequest.content,
            recipients: [(await rTransportServices.account.getIdentityInfo()).value.address]
        });

        expect(result).toBeSuccessful();

        sRequestMessage = result.value;
    });

    test("sender: mark the outgoing IQL Request as sent", async () => {
        let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await sConsumptionServices.outgoingRequests.sent({ requestId: sLocalRequest.id, messageId: sRequestMessage.id });

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

        rRequestMessage = await syncUntilHasMessageWithRequest(rTransportServices, sLocalRequest.id);
        const result = await rConsumptionServices.incomingRequests.received({
            receivedRequest: rRequestMessage.content,
            requestSourceId: rRequestMessage.id
        });

        expect(result).toBeSuccessful();

        rLocalRequest = (await rConsumptionServices.incomingRequests.getRequest({ id: result.value.id })).value;

        expect(rLocalRequest).toBeDefined();
        expect(rLocalRequest.status).toBe(LocalRequestStatus.Open);
        expect(rLocalRequest.id).toBe(sLocalRequest.id);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.id).toBe(result.value.id);
    });

    test("recipient: check prerequisites of incoming IQL Request", async () => {
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.checkPrerequisites({
            requestId: rLocalRequest.id
        });

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
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.requireManualDecision({
            requestId: rLocalRequest.id
        });

        expect(result).toBeSuccessful();

        rLocalRequest = result.value;

        expect(rLocalRequest).toBeDefined();
        expect(rLocalRequest.status).toBe(LocalRequestStatus.ManualDecisionRequired);

        expect(triggeredEvent).toBeDefined();
        expect(triggeredEvent!.data).toBeDefined();
        expect(triggeredEvent!.data.oldStatus).toBe(LocalRequestStatus.DecisionRequired);
        expect(triggeredEvent!.data.newStatus).toBe(LocalRequestStatus.ManualDecisionRequired);
    });

    test("recipient: perform IQL Query to find attribute candidates", async () => {
        const requestItem: ReadAttributeRequestItemJSON = rLocalRequest.content.items[0] as ReadAttributeRequestItemJSON;

        const query: IQLQueryJSON = requestItem.query as IQLQueryJSON;

        const IQL_RESULT = await rConsumptionServices.attributes.executeIQLQuery({ query });

        expect(IQL_RESULT).toBeSuccessful();

        rQueryResult = IQL_RESULT.value;

        expect(rQueryResult).toHaveLength(1);
    });

    test("recipient: call canAccept for incoming IQL Request", async () => {
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
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.accept({
            requestId: rLocalRequest.id,
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
        const result = await rTransportServices.messages.sendMessage({
            content: rLocalRequest.response!.content,
            recipients: [(await sTransportServices.account.getIdentityInfo()).value.address]
        });

        expect(result).toBeSuccessful();

        rResponseMessage = result.value;

        expect(rResponseMessage.content["@type"]).toBe("Response");
    });

    test("recipient: complete incoming Request", async () => {
        let triggeredEvent: IncomingRequestStatusChangedEvent | undefined;
        rEventBus.subscribeOnce(IncomingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        const result = await rConsumptionServices.incomingRequests.complete({
            requestId: rLocalRequest.id,
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
        let triggeredEvent: OutgoingRequestStatusChangedEvent | undefined;
        sEventBus.subscribeOnce(OutgoingRequestStatusChangedEvent, (event) => {
            triggeredEvent = event;
        });

        sResponseMessage = await syncUntilHasMessageWithResponse(sTransportServices, sLocalRequest.id);
        const result = await sConsumptionServices.outgoingRequests.complete({
            messageId: sResponseMessage.id,
            receivedResponse: sResponseMessage.content
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
