import { LocalRequestStatus } from "@nmshd/consumption";
import { AbstractStringJSON, ProprietaryStringJSON, RelationshipAttributeConfidentiality } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateAttributeAcceptResponseItemDVO,
    CreateAttributeRequestItemDVO,
    DataViewExpander,
    DecidableCreateAttributeRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    MessageDTO,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
    TransportServices
} from "../../../src";
import { MockEventBus, RuntimeServiceProvider, establishRelationship, sendMessage, syncUntilHasMessages } from "../../lib";

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
    const sAddress = (await sTransportServices.account.getIdentityInfo()).value.address;
    const rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    const localRequest = await sConsumptionServices.outgoingRequests.create({
        content: {
            items: [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: {
                        "@type": "RelationshipAttribute",
                        owner: sAddress,
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Kundennummer"
                        },
                        key: "customerId",
                        confidentiality: "protected" as RelationshipAttributeConfidentiality
                    }
                }
            ]
        },
        peer: rAddress
    });

    senderMessage = await sendMessage(sTransportServices, rAddress, localRequest.value.content);

    const messages = await syncUntilHasMessages(rTransportServices, 1);
    if (messages.length < 1) {
        throw new Error("Not enough messages synced");
    }
    recipientMessage = messages[0];

    await rEventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    rEventBus.reset();
    sEventBus.reset();
});

describe("CreateRelationshipAttributeRequestItemDVO", () => {
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftRelationshipAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("0815");
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
        const requestItemDVO = dvo.request.content.items[0] as DecidableCreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableCreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.attribute.type).toBe("DraftRelationshipAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("0815");
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftRelationshipAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("0815");
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
        const responseItem = response!.content.items[0] as CreateAttributeAcceptResponseItemDVO;
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await rConsumptionServices.attributes.getAttributes({
            query: { "content.value.@type": "ProprietaryString", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const proprietaryString = attributeResult.value[0].content.value as ProprietaryStringJSON;
        expect(proprietaryString.value).toBe("0815");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.valueType).toBe("ProprietaryString");
        expect(proprietaryString.value).toStrictEqual((responseItem.attribute.content.value as ProprietaryStringJSON).value);
    });

    test("check the sender's dvo for the recipient", async () => {
        const dvo = await rExpander.expandAddress(senderMessage.createdBy);
        expect(dvo.items).toHaveLength(1);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        await syncUntilHasMessages(sTransportServices, 1);
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftRelationshipAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("0815");
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
        const responseItem = response!.content.items[0] as CreateAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("CreateAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await sConsumptionServices.attributes.getAttributes({
            query: { "content.value.@type": "ProprietaryString", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const proprietaryString = attributeResult.value[0].content.value as ProprietaryStringJSON;
        expect(proprietaryString.value).toBe("0815");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.valueType).toBe("ProprietaryString");
        expect(proprietaryString.value).toStrictEqual((responseItem.attribute.content.value as ProprietaryStringJSON).value);
    });

    test("check the attributes for the sender", async () => {
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        const attributeResult = await sConsumptionServices.attributes.getOwnSharedAttributes({
            peer: dvo.request.peer.id
        });

        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as ProprietaryStringJSON).value).toBe("0815");

        const relationshipAttributeResult = await sConsumptionServices.attributes.getAttributes({
            query: { "shareInfo.peer": dvo.request.peer.id, "content.@type": "RelationshipAttribute" }
        });
        expect(relationshipAttributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
    });

    test("check the recipient's dvo for the sender", async () => {
        const dvo = await sExpander.expandAddress(senderMessage.recipients[0].address);

        expect(dvo.name).toStrictEqual(senderMessage.recipients[0].address.substring(3, 9));
        expect(dvo.items).toHaveLength(0);
    });
});
