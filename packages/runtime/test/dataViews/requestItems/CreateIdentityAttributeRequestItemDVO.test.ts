import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { AbstractStringJSON, CreateAttributeAcceptResponseItemJSON, DisplayNameJSON, RequestJSON } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateAttributeAcceptResponseItemDVO,
    CreateAttributeRequestItemDVO,
    CreateOutgoingRequestRequest,
    DataViewExpander,
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
let sConsumptionServices: ConsumptionServices;
let rConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;
let rEventBus: MockEventBus;
let rAddress: string;
let requestContent: CreateOutgoingRequestRequest;
let responseItems: DecideRequestItemParametersJSON[];

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    sRuntimeServices = runtimeServices[0];
    rRuntimeServices = runtimeServices[1];
    sTransportServices = sRuntimeServices.transport;
    rTransportServices = rRuntimeServices.transport;
    sExpander = sRuntimeServices.expander;
    rExpander = rRuntimeServices.expander;
    sConsumptionServices = sRuntimeServices.consumption;
    rConsumptionServices = rRuntimeServices.consumption;
    sEventBus = runtimeServices[0].eventBus;
    rEventBus = runtimeServices[1].eventBus;
    await establishRelationship(sTransportServices, rTransportServices);
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    requestContent = {
        content: {
            items: [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: rAddress,
                        value: {
                            "@type": "DisplayName",
                            value: "aDisplayName"
                        }
                    }
                }
            ]
        },
        peer: rAddress
    };

    responseItems = [{ accept: true }];
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(async function () {
    await cleanupAttributes([sRuntimeServices, rRuntimeServices]);
    rEventBus.reset();
    sEventBus.reset();
});

describe("CreateIdentityAttributeRequestItemDVO", () => {
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("aDisplayName");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
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
        expect(dvo.request.status).toBe("DecisionRequired");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.DecisionRequired");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(true);
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("aDisplayName");
        expect(requestItemDVO.attribute.renderHints.technicalType).toBe("String");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("aDisplayName");
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
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as CreateAttributeAcceptResponseItemDVO;
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await rConsumptionServices.attributes.getOwnAttributesSharedWithPeer({ peer: dvo.createdBy.id, query: { "content.value.@type": "DisplayName" } });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toBe("aDisplayName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.valueType).toBe("DisplayName");
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toStrictEqual((responseItem.attribute.content.value as DisplayNameJSON).value);

        await syncUntilHasMessageWithResponse(sTransportServices, recipientMessage.content.id!);
        await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent);
    });

    test("check the sender's dvo for the recipient", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = await rExpander.expandAddress(senderMessage.createdBy);
        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.items).toHaveLength(0);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = (
            await sConsumptionServices.attributes.getAttributes({
                query: { "content.value.@type": "DisplayName", peer: rAddress }
            })
        ).value.length;
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
        const requestItemDVO = dvo.request.content.items[0] as CreateAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("CreateAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("DisplayName");
        expect(value.value).toBe("aDisplayName");
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
        expect(response!.content.type).toBe("ResponseDVO");
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as CreateAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("CreateAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await sConsumptionServices.attributes.getAttributes({
            query: { "content.value.@type": "DisplayName", peer: dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        const numberOfAttributes = attributeResult.value.length;
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();
        expect((attributeResult.value[numberOfAttributes - 1].content.value as DisplayNameJSON).value).toBe("aDisplayName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.valueType).toBe("DisplayName");
        expect((attributeResult.value[numberOfAttributes - 1].content.value as DisplayNameJSON).value).toStrictEqual(
            (responseItem.attribute.content.value as DisplayNameJSON).value
        );
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
    });

    test("check the attributes for the sender", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        const attributeResult = await sConsumptionServices.attributes.getOwnAttributesSharedWithPeer({
            peer: dvo.request.peer.id
        });

        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(0);
    });

    test("check the recipient's dvo for the sender", async () => {
        const baselineNumberOfItems = (await sExpander.expandAddress(rAddress)).items!.length;
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = await sExpander.expandAddress(senderMessage.recipients[0].address);
        const numberOfItems = dvo.items!.length;
        expect(dvo.name).toBe("aDisplayName");
        expect(numberOfItems - baselineNumberOfItems).toBe(1);
    });

    test("check the MessageDVO for the recipient after they deleted the shared Attribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as CreateAttributeAcceptResponseItemJSON).attributeId;

        await rRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttributeId });

        const recipientMessage = (await rRuntimeServices.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        const responseItemDVO = dvo.request.response!.content.items[0];
        expect(responseItemDVO.type).toBe("AttributeAlreadyDeletedAcceptResponseItemDVO");
    });

    test("check the MessageDVO for the sender after they deleted the shared Attribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as CreateAttributeAcceptResponseItemJSON).attributeId;

        await sRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttributeId });

        const senderMessageAfterDeletion = (await sRuntimeServices.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = (await sExpander.expandMessageDTO(senderMessageAfterDeletion)) as RequestMessageDVO;
        const responseItemDVO = dvo.request.response!.content.items[0];
        expect(responseItemDVO.type).toBe("AttributeAlreadyDeletedAcceptResponseItemDVO");
    });
});
