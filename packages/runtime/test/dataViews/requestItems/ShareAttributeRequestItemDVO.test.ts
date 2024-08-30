import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { AbstractStringJSON, DisplayNameJSON, ShareAttributeRequestItemJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import {
    AcceptResponseItemDVO,
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    DecidableShareAttributeRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
    ShareAttributeRequestItemDVO,
    TransportServices
} from "../../../src";
import {
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
let requestContent: CreateOutgoingRequestRequest;
let responseItems: DecideRequestItemParametersJSON[];
let sAddress: string;
let rAddress: string;

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
    sEventBus = sRuntimeServices.eventBus;
    rEventBus = rRuntimeServices.eventBus;
    await establishRelationship(sTransportServices, rTransportServices);
    sAddress = (await sTransportServices.account.getIdentityInfo()).value.address;
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    responseItems = [{ accept: true }];
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(async () => {
    const senderAttribute = await sConsumptionServices.attributes.createRepositoryAttribute({
        content: {
            value: {
                "@type": "DisplayName",
                value: "Dr. Theodor Munchkin von Reichenhardt"
            }
        }
    });

    requestContent = {
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
    };

    rEventBus.reset();
    sEventBus.reset();
});

afterEach(async () => {
    await cleanupAttributes();
});

async function cleanupAttributes() {
    await Promise.all(
        [sRuntimeServices, rRuntimeServices].map(async (services) => {
            const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

            const servicesAttributesResult = await services.consumption.attributes.getAttributes({});
            for (const attribute of servicesAttributesResult.value) {
                await servicesAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
            }
        })
    );
}

describe("ShareAttributeRequestItemDVO", () => {
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
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();
        expect((attributeResult.value[0].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");

        await syncUntilHasMessageWithResponse(sTransportServices, recipientMessage.content.id!);
        await sEventBus.waitForEvent(OutgoingRequestStatusChangedEvent);
    });

    test("check the sender's dvo for the recipient", async () => {
        const baselineNumberOfItems = (await rExpander.expandAddress(sAddress)).items?.length ?? 0;
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = await rExpander.expandAddress(senderMessage.createdBy);
        expect(dvo.name).toBe("Dr. Theodor Munchkin von Reichenhardt");
        const numberOfItems = dvo.items!.length;
        expect(numberOfItems - baselineNumberOfItems).toBe(1);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = (
            await sConsumptionServices.attributes.getAttributes({
                query: { "content.value.@type": "DisplayName", "shareInfo.peer": rAddress }
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
        const numberOfAttributes = attributeResult.value.length;
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();
        expect((attributeResult.value[numberOfAttributes - 1].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");
    });

    test("check the attributes for the sender", async () => {
        const baselineNumberOfAttributes = (await sConsumptionServices.attributes.getOwnSharedAttributes({ peer: rAddress })).value.length;
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = (await sExpander.expandMessageDTO(senderMessage)) as RequestMessageDVO;
        const attributeResult = await sConsumptionServices.attributes.getOwnSharedAttributes({
            peer: dvo.request.peer.id
        });

        expect(attributeResult).toBeSuccessful();
        const numberOfAttributes = attributeResult.value.length;
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();
        expect((attributeResult.value[numberOfAttributes - 1].content.value as DisplayNameJSON).value).toBe("Dr. Theodor Munchkin von Reichenhardt");
    });

    test("check the recipient's dvo for the sender", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const dvo = await sExpander.expandAddress(senderMessage.recipients[0].address);

        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.items).toHaveLength(0);
    });
});
