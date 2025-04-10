import { AcceptFormFieldRequestItemParametersJSON, DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { FormFieldRequestItem, SelectionFormFieldSettings, SelectionFormFieldSettingsJSON, StringFormFieldSettings, StringFormFieldSettingsJSON } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    FormFieldAcceptResponseItemDVO,
    FormFieldRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    OutgoingRequestStatusChangedEvent,
    RequestMessageDVO,
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
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;
let transportServices1: TransportServices;
let transportServices2: TransportServices;
let expander1: DataViewExpander;
let expander2: DataViewExpander;
let consumptionServices2: ConsumptionServices;
let eventBus1: MockEventBus;
let eventBus2: MockEventBus;
let address2: string;

let requestContent: CreateOutgoingRequestRequest;
let responseItems: DecideRequestItemParametersJSON[];

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    eventBus1.reset();
    eventBus2.reset();
});

describe("FormFieldRequestItemDVO with StringFormFieldSettings", () => {
    const aMin = 1;
    const aMax = 10;

    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        runtimeServices1 = runtimeServices[0];
        runtimeServices2 = runtimeServices[1];
        transportServices1 = runtimeServices1.transport;
        transportServices2 = runtimeServices2.transport;
        expander1 = runtimeServices1.expander;
        expander2 = runtimeServices2.expander;
        consumptionServices2 = runtimeServices2.consumption;
        eventBus1 = runtimeServices1.eventBus;
        eventBus2 = runtimeServices2.eventBus;

        await establishRelationship(transportServices1, transportServices2);
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        requestContent = {
            content: {
                items: [
                    FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aStringFormField",
                        settings: StringFormFieldSettings.from({ allowNewLines: true, min: aMin, max: aMax })
                    }).toJSON()
                ]
            },
            peer: address2
        };

        responseItems = [{ accept: true, response: "I accept to specify a free string value." } as AcceptFormFieldRequestItemParametersJSON];
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await syncUntilHasMessageWithRequest(transportServices2, senderMessage.content.id!);
        const dto = senderMessage;
        const dvo = (await expander1.expandMessageDTO(senderMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("StringFormFieldSettings");
        const stringFormFieldSettings = requestItemDVO.settings as StringFormFieldSettingsJSON;
        expect(stringFormFieldSettings.allowNewLines).toBe(true);
        expect(stringFormFieldSettings.min).toBe(aMin);
        expect(stringFormFieldSettings.max).toBe(aMax);
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const dto = recipientMessage;
        const dvo = (await expander2.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableFormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("StringFormFieldSettings");
        const stringFormFieldSettings = requestItemDVO.settings as StringFormFieldSettingsJSON;
        expect(stringFormFieldSettings.allowNewLines).toBe(true);
        expect(stringFormFieldSettings.min).toBe(aMin);
        expect(stringFormFieldSettings.max).toBe(aMax);
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: recipientMessage.content.id!,
            items: responseItems
        });
        expect(acceptResult).toBeSuccessful();

        const dto = recipientMessage;
        const dvo = (await expander2.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("StringFormFieldSettings");
        const stringFormFieldSettings = requestItemDVO.settings as StringFormFieldSettingsJSON;
        expect(stringFormFieldSettings.allowNewLines).toBe(true);
        expect(stringFormFieldSettings.min).toBe(aMin);
        expect(stringFormFieldSettings.max).toBe(aMax);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as FormFieldAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("FormFieldAcceptResponseItemDVO");
        expect(responseItem.response).toBe("I accept to specify a free string value.");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        await syncUntilHasMessageWithResponse(transportServices1, recipientMessage.content.id!);
        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(runtimeServices1, runtimeServices2, requestContent, responseItems);
        const dto = senderMessage;
        const dvo = (await expander1.expandMessageDTO(senderMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("StringFormFieldSettings");
        const stringFormFieldSettings = requestItemDVO.settings as StringFormFieldSettingsJSON;
        expect(stringFormFieldSettings.allowNewLines).toBe(true);
        expect(stringFormFieldSettings.min).toBe(aMin);
        expect(stringFormFieldSettings.max).toBe(aMax);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as FormFieldAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("FormFieldAcceptResponseItemDVO");
        expect(responseItem.response).toBe("I accept to specify a free string value.");
        expect(requestItemDVO.response).toStrictEqual(responseItem);
    });
});

describe("FormFieldRequestItemDVO with SelectionFormFieldSettings", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        runtimeServices1 = runtimeServices[0];
        runtimeServices2 = runtimeServices[1];
        transportServices1 = runtimeServices1.transport;
        transportServices2 = runtimeServices2.transport;
        expander1 = runtimeServices1.expander;
        expander2 = runtimeServices2.expander;
        consumptionServices2 = runtimeServices2.consumption;
        eventBus1 = runtimeServices1.eventBus;
        eventBus2 = runtimeServices2.eventBus;

        await establishRelationship(transportServices1, transportServices2);
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        requestContent = {
            content: {
                items: [
                    FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aSelectionFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    }).toJSON()
                ]
            },
            peer: address2
        };

        responseItems = [{ accept: true, response: ["optionA"] } as AcceptFormFieldRequestItemParametersJSON];
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await syncUntilHasMessageWithRequest(transportServices2, senderMessage.content.id!);
        const dto = senderMessage;
        const dvo = (await expander1.expandMessageDTO(senderMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("SelectionFormFieldSettings");
        const selectionFormFieldSettings = requestItemDVO.settings as SelectionFormFieldSettingsJSON;
        expect(selectionFormFieldSettings.options).toStrictEqual(["optionA", "optionB"]);
        expect(selectionFormFieldSettings.allowMultipleSelection).toBe(true);
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const dto = recipientMessage;
        const dvo = (await expander2.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableFormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("SelectionFormFieldSettings");
        const selectionFormFieldSettings = requestItemDVO.settings as SelectionFormFieldSettingsJSON;
        expect(selectionFormFieldSettings.options).toStrictEqual(["optionA", "optionB"]);
        expect(selectionFormFieldSettings.allowMultipleSelection).toBe(true);
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: recipientMessage.content.id!,
            items: responseItems
        });
        expect(acceptResult).toBeSuccessful();

        const dto = recipientMessage;
        const dvo = (await expander2.expandMessageDTO(recipientMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("SelectionFormFieldSettings");
        const selectionFormFieldSettings = requestItemDVO.settings as SelectionFormFieldSettingsJSON;
        expect(selectionFormFieldSettings.options).toStrictEqual(["optionA", "optionB"]);
        expect(selectionFormFieldSettings.allowMultipleSelection).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as FormFieldAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("SelectionFormAcceptResponseItemDVO");
        expect(responseItem.response).toStrictEqual(["optionA"]);
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        await syncUntilHasMessageWithResponse(transportServices1, recipientMessage.content.id!);
        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(runtimeServices1, runtimeServices2, requestContent, responseItems);
        const dto = senderMessage;
        const dvo = (await expander1.expandMessageDTO(senderMessage)) as RequestMessageDVO;
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
        const requestItemDVO = dvo.request.content.items[0] as FormFieldRequestItemDVO;
        expect(requestItemDVO.type).toBe("FormFieldRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.settings["@type"]).toBe("SelectionFormFieldSettings");
        const selectionFormFieldSettings = requestItemDVO.settings as SelectionFormFieldSettingsJSON;
        expect(selectionFormFieldSettings.options).toStrictEqual(["optionA", "optionB"]);
        expect(selectionFormFieldSettings.allowMultipleSelection).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as FormFieldAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("SelectionFormAcceptResponseItemDVO");
        expect(responseItem.response).toStrictEqual(["optionA"]);
        expect(requestItemDVO.response).toStrictEqual(responseItem);
    });
});
