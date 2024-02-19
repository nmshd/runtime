import { LocalRequestStatus } from "@nmshd/consumption";
import { AbstractStringJSON, DisplayNameJSON, ShareAttributeRequestItemJSON } from "@nmshd/content";
import {
    AcceptResponseItemDVO,
    ConsumptionServices,
    DataViewExpander,
    DecidableShareAttributeRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    MessageDTO,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
    ShareAttributeRequestItemDVO,
    TransportServices
} from "../../../src";
import { establishRelationship, MockEventBus, RuntimeServiceProvider, sendMessage, syncUntilHasMessageWithRequest, syncUntilHasMessageWithResponse } from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let sTransportServices: TransportServices;
let rTransportServices: TransportServices;
let sExpander: DataViewExpander;
let rExpander: DataViewExpander;
let sConsumptionServices: ConsumptionServices;
let rConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;
let rEventBus: MockEventBus;
let senderMessage: MessageDTO;
let recipientMessage: MessageDTO;
let requestId: string;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    sTransportServices = runtimeServices[0].transport;
    rTransportServices = runtimeServices[1].transport;
    sExpander = runtimeServices[0].expander;
    rExpander = runtimeServices[1].expander;
    sConsumptionServices = runtimeServices[0].consumption;
    rConsumptionServices = runtimeServices[1].consumption;
    sEventBus = runtimeServices[0].eventBus;
    rEventBus = runtimeServices[1].eventBus;
    await establishRelationship(sTransportServices, rTransportServices);
    const rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    const senderAttribute = await sConsumptionServices.attributes.createRepositoryAttribute({
        content: {
            value: {
                "@type": "DisplayName",
                value: "Dr. Theodor Munchkin von Reichenhardt"
            }
        }
    });

    const localRequest = await sConsumptionServices.outgoingRequests.create({
        content: {
            items: [
                {
                    "@type": "ShareAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: senderAttribute.value.content,
                    sourceAttributeId: senderAttribute.value.id
                } as ShareAttributeRequestItemJSON
            ]
        },
        peer: rAddress
    });
    requestId = localRequest.value.id;

    senderMessage = await sendMessage(sTransportServices, rAddress, localRequest.value.content);
    recipientMessage = await syncUntilHasMessageWithRequest(rTransportServices, localRequest.value.id);

    await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    rEventBus.reset();
    sEventBus.reset();
});

describe("ShareAttributeRequestItemDVO", () => {
    test("check the MessageDVO for the sender", async () => {
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
        const requestItemDVO = dvo.request.content.items[0] as ShareAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ShareAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
    });

    test("check the MessageDVO for the recipient and accept it", async () => {
        const dto = recipientMessage;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toBe(dto.createdAt);
        expect(dvo.request).toBeDefined();
        expect(dvo.request.isOwn).toBe(false);
        expect(dvo.request.status).toBe("DecisionRequired");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.DecisionRequired");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(true);
        const requestItemDVO = dvo.request.content.items[0] as DecidableShareAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableShareAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(requestItemDVO.attribute.renderHints.technicalType).toBe("String");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const acceptResult = await rConsumptionServices.incomingRequests.accept({
            requestId: dvo.request.id,
            items: [{ accept: true }]
        });
        expect(acceptResult).toBeSuccessful();
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
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
        const requestItemDVO = dvo.request.content.items[0] as ShareAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ShareAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(requestItemDVO.attribute.renderHints.technicalType).toBe("String");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as AcceptResponseItemDVO;
        expect(responseItem.type).toBe("ShareAttributeAcceptResponseItemDVO");
        expect(requestItemDVO.response).toStrictEqual(responseItem);
        expect(requestItemDVO.attribute.id).toStrictEqual((responseItem as any).attributeId);

        const attributeResult = await rConsumptionServices.attributes.getAttributes({
            query: { "content.value.@type": "DisplayName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");
    });

    test("check the sender's dvo for the recipient", async () => {
        const dvo = await rExpander.expandAddress(senderMessage.createdBy);
        expect(dvo.name).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(dvo.items).toHaveLength(1);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        await syncUntilHasMessageWithResponse(sTransportServices, requestId);
        await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent);

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
        const requestItemDVO = dvo.request.content.items[0] as ShareAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ShareAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(requestItemDVO.attribute.renderHints.technicalType).toBe("String");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
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
        expect(responseItem.type).toBe("ShareAttributeAcceptResponseItemDVO");
        expect(requestItemDVO.response).toStrictEqual(responseItem);
        expect(requestItemDVO.attribute.id).toStrictEqual((responseItem as any).attributeId);

        const attributeResult = await sConsumptionServices.attributes.getAttributes({
            query: { "content.value.@type": "DisplayName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");
    });

    test("check the attributes for the sender", async () => {
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        const attributeResult = await sConsumptionServices.attributes.getOwnSharedAttributes({
            peer: dvo.request.peer.id
        });

        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");
    });

    test("check the recipient's dvo for the sender", async () => {
        const dvo = await sExpander.expandAddress(senderMessage.recipients[0].address);

        expect(dvo.name).toStrictEqual(senderMessage.recipients[0].address.substring(3, 9));
        expect(dvo.items).toHaveLength(0);
    });
});
