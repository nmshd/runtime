import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { AbstractStringJSON, DeleteAttributeRequestItemJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import {
    AcceptResponseItemDVO,
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    DeleteAttributeRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
    TransportServices
} from "../../../src";
import {
    cleanupAttributes,
    establishRelationship,
    exchangeAndAcceptRequestByMessage,
    exchangeMessageWithRequest,
    executeFullCreateAndShareOwnIdentityAttributeFlow,
    MockEventBus,
    RuntimeServiceProvider,
    sendMessageWithRequest,
    syncUntilHasMessageWithRequest,
    syncUntilHasMessageWithResponse,
    TestRuntimeServices
} from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let sRuntimeServices: TestRuntimeServices;
let rRuntimeServices: TestRuntimeServices;
let sTransportServices: TransportServices;
let rTransportServices: TransportServices;
let sExpander: DataViewExpander;
let rExpander: DataViewExpander;
let rConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;
let rEventBus: MockEventBus;
let requestContent: CreateOutgoingRequestRequest;
let responseItems: DecideRequestItemParametersJSON[];
let rAddress: string;

let attributeId: string;
let deletionDate: string;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true });
    sRuntimeServices = runtimeServices[0];
    rRuntimeServices = runtimeServices[1];
    sTransportServices = sRuntimeServices.transport;
    rTransportServices = rRuntimeServices.transport;
    sExpander = sRuntimeServices.expander;
    rExpander = rRuntimeServices.expander;
    rConsumptionServices = rRuntimeServices.consumption;
    sEventBus = sRuntimeServices.eventBus;
    rEventBus = rRuntimeServices.eventBus;
    await establishRelationship(sTransportServices, rTransportServices);
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;
}, 30000);

beforeEach(async () => {
    await cleanupAttributes([sRuntimeServices, rRuntimeServices]);
    const sOwnSharedIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(sRuntimeServices, rRuntimeServices, {
        content: {
            value: {
                "@type": "GivenName",
                value: "A given name"
            }
        }
    });

    attributeId = sOwnSharedIdentityAttribute.id;

    requestContent = {
        content: {
            items: [
                {
                    "@type": "DeleteAttributeRequestItem",
                    mustBeAccepted: true,
                    attributeId: attributeId
                } as DeleteAttributeRequestItemJSON
            ]
        },
        peer: rAddress
    };

    deletionDate = CoreDate.utc().add({ days: 1 }).toString();
    responseItems = [{ accept: true, deletionDate: deletionDate }] as any;

    rEventBus.reset();
    sEventBus.reset();
}, 30000);

afterAll(() => serviceProvider.stop());

describe("DeleteAttributeRequestItemDVO", () => {
    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
        await syncUntilHasMessageWithRequest(rTransportServices, senderMessage.content.id!);
        const dto = senderMessage;
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toBe(dto.createdAt);
        expect(dvo.request).toBeDefined();
        expect(dvo.request.isOwn).toBe(true);
        expect(dvo.request.status).toBe("Open");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Open");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as DeleteAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DeleteAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("SharedToPeerAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("A given name");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(false);
        expect(requestItemDVO.attribute.isOwn).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.attributeId).toBe(attributeId);
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
        await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const dto = recipientMessage;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toBe(dto.createdAt);
        expect(dvo.request).toBeDefined();
        expect(dvo.request.isOwn).toBe(false);
        expect(["DecisionRequired", "ManualDecisionRequired"]).toContain(dvo.request.status);
        expect(["i18n://dvo.localRequest.status.DecisionRequired", "i18n://dvo.localRequest.status.ManualDecisionRequired"]).toContain(dvo.request.statusText);
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(true);
        const requestItemDVO = dvo.request.content.items[0] as DeleteAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DeleteAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.attribute.type).toBe("PeerAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("A given name");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(false);
        expect(requestItemDVO.attribute.isOwn).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.attributeId).toBe(attributeId);
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestContent);
        await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const acceptResult = await rConsumptionServices.incomingRequests.accept({
            requestId: recipientMessage.content.id!,
            items: responseItems
        });
        expect(acceptResult).toBeSuccessful();
        const dto = recipientMessage;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toBe(dto.createdAt);
        expect(dvo.request).toBeDefined();
        expect(dvo.request.isOwn).toBe(false);
        expect(dvo.request.status).toBe("Decided");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Decided");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as DeleteAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DeleteAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as AcceptResponseItemDVO;
        expect(responseItem.type).toBe("DeleteAttributeAcceptResponseItemDVO");
        expect((responseItem as any).deletionDate).toBe(deletionDate);
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        await syncUntilHasMessageWithResponse(sTransportServices, recipientMessage.content.id!);
        await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dto = senderMessage;
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toBe(dto.createdAt);
        expect(dvo.request).toBeDefined();
        expect(dvo.request.isOwn).toBe(true);
        expect(dvo.request.status).toBe("Completed");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Completed");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as DeleteAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DeleteAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("SharedToPeerAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("A given name");
        expect(requestItemDVO.attribute.renderHints.technicalType).toBe("String");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(false);
        expect(requestItemDVO.attribute.isOwn).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.type).toBe("ResponseDVO");
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as AcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("DeleteAttributeAcceptResponseItemDVO");
        expect((responseItem as any).deletionDate).toBe(deletionDate);
        expect(requestItemDVO.response).toStrictEqual(responseItem);
        expect(requestItemDVO.attributeId).toBe(attributeId);
    });

    test("check the recipient's dvo for the sender", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = await sExpander.expandAddress(senderMessage.recipients[0].address);

        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.items).toHaveLength(0);
    });
});
