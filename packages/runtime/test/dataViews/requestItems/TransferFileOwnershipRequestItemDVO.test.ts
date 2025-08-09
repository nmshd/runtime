import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { RequestJSON, TransferFileOwnershipAcceptResponseItemJSON, TransferFileOwnershipRequestItemJSON } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
    TransferFileOwnershipAcceptResponseItemDVO,
    TransferFileOwnershipRequestItemDVO,
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
    TestRuntimeServices,
    uploadFile
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

let truncatedFileReference: string;

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
    rAddress = (await rTransportServices.account.getIdentityInfo()).value.address;

    await establishRelationship(sTransportServices, rTransportServices);
}, 30000);

beforeEach(async () => {
    const file = await uploadFile(sTransportServices);
    truncatedFileReference = file.reference.truncated;

    requestContent = {
        content: {
            items: [
                {
                    "@type": "TransferFileOwnershipRequestItem",
                    mustBeAccepted: true,
                    fileReference: truncatedFileReference,
                    ownershipToken: file.ownershipToken
                } as TransferFileOwnershipRequestItemJSON
            ]
        },
        peer: rAddress
    };

    responseItems = [{ accept: true }] as any;

    await cleanupAttributes([sRuntimeServices, rRuntimeServices]);

    rEventBus.reset();
    sEventBus.reset();
}, 30000);

afterAll(() => serviceProvider.stop());

describe("TransferFileOwnershipRequestItemDVO", () => {
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

        const requestItemDVO = dvo.request.content.items[0] as TransferFileOwnershipRequestItemDVO;
        expect(requestItemDVO.type).toBe("TransferFileOwnershipRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.fileReference).toBe(truncatedFileReference);
        expect(requestItemDVO.file.type).toBe("FileDVO");
        expect(requestItemDVO.file.reference.truncated).toBe(truncatedFileReference);
        expect(requestItemDVO.ownershipToken).toBeDefined();
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

        const requestItemDVO = dvo.request.content.items[0] as TransferFileOwnershipRequestItemDVO;
        expect(requestItemDVO.type).toBe("TransferFileOwnershipRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.fileReference).toBe(truncatedFileReference);
        expect(requestItemDVO.file.type).toBe("FileDVO");
        expect(requestItemDVO.file.reference.truncated).toBe(truncatedFileReference);
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

        const requestItemDVO = dvo.request.content.items[0] as TransferFileOwnershipRequestItemDVO;
        expect(requestItemDVO.type).toBe("TransferFileOwnershipRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);

        const responseItemDVO = response!.content.items[0] as TransferFileOwnershipAcceptResponseItemDVO;
        expect(responseItemDVO.type).toBe("TransferFileOwnershipAcceptResponseItemDVO");
        expect(requestItemDVO.response).toStrictEqual(responseItemDVO);
        expect(responseItemDVO.attribute).toBeDefined();
        expect(responseItemDVO.attributeId).toBe(responseItemDVO.attribute.id);
        expect(responseItemDVO.id).toBe(responseItemDVO.attribute.id);

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

        const requestItemDVO = dvo.request.content.items[0] as TransferFileOwnershipRequestItemDVO;
        expect(requestItemDVO.type).toBe("TransferFileOwnershipRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.type).toBe("ResponseDVO");
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);

        const responseItemDVO = response!.content.items[0] as TransferFileOwnershipAcceptResponseItemDVO;
        expect(responseItemDVO.result).toBe("Accepted");
        expect(responseItemDVO.type).toBe("TransferFileOwnershipAcceptResponseItemDVO");
        expect(requestItemDVO.response).toStrictEqual(responseItemDVO);
        expect(responseItemDVO.attribute).toBeDefined();
        expect(responseItemDVO.attributeId).toBe(responseItemDVO.attribute.id);
        expect(responseItemDVO.id).toBe(responseItemDVO.attributeId);
    });

    test("check the MessageDVO for the recipient after they deleted the shared Attribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as TransferFileOwnershipAcceptResponseItemJSON).attributeId;

        await rRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttributeId });

        const recipientMessage = (await rRuntimeServices.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        const responseItemDVO = dvo.request.response!.content.items[0];
        expect(responseItemDVO.type).toBe("AttributeAlreadyDeletedAcceptResponseItemDVO");
    });

    test("check the MessageDVO for the recipient after they deleted the RepositoryAttribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as TransferFileOwnershipAcceptResponseItemJSON).attributeId;
        const sharedAttribute = (await rRuntimeServices.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;

        await rRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttribute.id });

        const recipientMessage = (await rRuntimeServices.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = (await rExpander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
        const responseItemDVO = dvo.request.response!.content.items[0] as TransferFileOwnershipAcceptResponseItemDVO;
        expect(responseItemDVO.type).toBe("TransferFileOwnershipAcceptResponseItemDVO");
        expect(responseItemDVO.attribute).toBeDefined();
    });

    test("check the MessageDVO for the recipient after they deleted the shared and RepositoryAttribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(sRuntimeServices, rRuntimeServices, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await sRuntimeServices.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as TransferFileOwnershipAcceptResponseItemJSON).attributeId;

        await rRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttributeId });
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
        const sharedAttributeId = (localRequest.response!.content.items[0] as TransferFileOwnershipAcceptResponseItemJSON).attributeId;

        await sRuntimeServices.consumption.attributes.deleteAttributeAndNotify({ attributeId: sharedAttributeId });

        const senderMessageAfterDeletion = (await sRuntimeServices.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = (await sExpander.expandMessageDTO(senderMessageAfterDeletion)) as RequestMessageDVO;
        const responseItemDVO = dvo.request.response!.content.items[0];
        expect(responseItemDVO.type).toBe("AttributeAlreadyDeletedAcceptResponseItemDVO");
    });
});
