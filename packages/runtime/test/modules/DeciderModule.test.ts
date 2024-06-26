import { LocalRequestStatus } from "@nmshd/consumption";
import { Request } from "@nmshd/content";
import { CoreDate } from "@nmshd/transport";
import {
    ConsumptionServices,
    IncomingRequestStatusChangedEvent,
    MessageProcessedEvent,
    MessageProcessedResult,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult,
    TransportServices
} from "../../src";
import { MockEventBus, RuntimeServiceProvider, TestRequestItem, establishRelationship, exchangeMessage } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rEventBus: MockEventBus;
let rTransportServices: TransportServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableDeciderModule: true });
    sTransportServices = runtimeServices[0].transport;

    rConsumptionServices = runtimeServices[1].consumption;
    rEventBus = runtimeServices[1].eventBus;
    rTransportServices = runtimeServices[1].transport;

    await establishRelationship(sTransportServices, rTransportServices);
}, 30000);

beforeEach(function () {
    rEventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("DeciderModule", () => {
    test("moves an incoming Request from a Message into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
        const message = await exchangeMessage(sTransportServices, rTransportServices);

        const receivedRequestResult = await rConsumptionServices.incomingRequests.received({
            receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            requestSourceId: message.id
        });

        await rConsumptionServices.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(rEventBus).toHavePublished(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        const requestAfterAction = await rConsumptionServices.incomingRequests.getRequest({ id: receivedRequestResult.value.id });
        expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
    });

    test("triggers MessageProcessedEvent", async () => {
        const message = await exchangeMessage(sTransportServices, rTransportServices);

        const receivedRequestResult = await rConsumptionServices.incomingRequests.received({
            receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
            requestSourceId: message.id
        });

        await rConsumptionServices.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(rEventBus).toHavePublished(MessageProcessedEvent, (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired);
    });

    test("moves an incoming Request from a Relationship Template into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
        const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
        const template = (
            await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content: {
                    "@type": "RelationshipTemplateContent",
                    onNewRelationship: request.toJSON()
                },
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
            })
        ).value;

        await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

        const receivedRequestResult = await rConsumptionServices.incomingRequests.received({
            receivedRequest: request.toJSON(),
            requestSourceId: template.id
        });

        await rConsumptionServices.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await expect(rEventBus).toHavePublished(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        const requestAfterAction = await rConsumptionServices.incomingRequests.getRequest({ id: receivedRequestResult.value.id });

        expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
    });

    test("triggers RelationshipTemplateProcessedEvent for an incoming Request from a Template after it reached status 'DecisionRequired'", async () => {
        const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
        const template = (
            await sTransportServices.relationshipTemplates.createOwnRelationshipTemplate({
                content: {
                    "@type": "RelationshipTemplateContent",
                    onNewRelationship: request.toJSON()
                },
                expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
            })
        ).value;

        await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

        const receivedRequestResult = await rConsumptionServices.incomingRequests.received({
            receivedRequest: request.toJSON(),
            requestSourceId: template.id
        });

        await rConsumptionServices.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

        await rEventBus.waitForEvent(
            IncomingRequestStatusChangedEvent,
            (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired && e.data.request.id === receivedRequestResult.value.id
        );

        await expect(rEventBus).toHavePublished(
            RelationshipTemplateProcessedEvent,
            (e) => e.data.template.id === template.id && e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired
        );
    });
});
