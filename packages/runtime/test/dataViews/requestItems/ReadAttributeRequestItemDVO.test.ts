import { AcceptReadAttributeRequestItemParametersWithNewAttributeJSON, DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { GivenNameJSON, IdentityAttributeQuery, IQLQuery, ReadAttributeRequestItem, SurnameJSON } from "@nmshd/content";
import {
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    DecidableReadAttributeRequestItemDVO,
    IdentityAttributeQueryDVO,
    IQLQueryDVO,
    ProcessedIdentityAttributeQueryDVO,
    ProcessedIQLQueryDVO,
    ReadAttributeAcceptResponseItemDVO,
    ReadAttributeRequestItemDVO,
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
    syncAndGetBaselineNumberOfAttributes,
    syncUntilHasMessageWithRequest,
    TestRuntimeServices
} from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;
let transportServices1: TransportServices;
let transportServices2: TransportServices;
let expander1: DataViewExpander;
let expander2: DataViewExpander;
let consumptionServices1: ConsumptionServices;
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

describe("ReadAttributeRequestItemDVO with IdentityAttributeQuery", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        runtimeServices1 = runtimeServices[0];
        runtimeServices2 = runtimeServices[1];
        transportServices1 = runtimeServices1.transport;
        transportServices2 = runtimeServices2.transport;
        expander1 = runtimeServices1.expander;
        expander2 = runtimeServices2.expander;
        consumptionServices1 = runtimeServices1.consumption;
        consumptionServices2 = runtimeServices2.consumption;
        eventBus1 = runtimeServices1.eventBus;
        eventBus2 = runtimeServices2.eventBus;

        await establishRelationship(transportServices1, transportServices2);
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        const attribute = await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Theodor"
                }
            }
        });

        requestContent = {
            content: {
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,

                        query: IdentityAttributeQuery.from({
                            valueType: "GivenName"
                        })
                    }).toJSON()
                ]
            },
            peer: address2
        };

        responseItems = [{ accept: true, newAttribute: attribute.value.content } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON];
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await syncUntilHasMessageWithRequest(transportServices2, senderMessage.content.id);
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as IdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
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
        const requestItemDVO = dvo.request.content.items[0] as DecidableReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as ProcessedIdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.results).toHaveLength(1);
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const resultItem = identityAttributeQueryDVO.results[0];
        expect(resultItem.type).toBe("RepositoryAttributeDVO");
        expect(resultItem.content["@type"]).toBe("IdentityAttribute");
        expect(resultItem.content.value["@type"]).toBe("GivenName");
        expect((resultItem.content.value as GivenNameJSON).value).toBe("Theodor");
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: recipientMessage.content.id,
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as IdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attribute).toBeDefined();
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute.content.value as GivenNameJSON).value).toBe("Theodor");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();

        const displayName = attributeResult.value[0].content.value as GivenNameJSON;
        expect(displayName.value).toBe("Theodor");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(displayName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = await syncAndGetBaselineNumberOfAttributes(runtimeServices1, {
            query: { "content.value.@type": "GivenName", "shareInfo.peer": address2 }
        });
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as IdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        const numberOfAttributes = attributeResult.value.length;
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();

        const givenName = attributeResult.value[numberOfAttributes - 1].content.value as GivenNameJSON;
        expect(givenName.value).toBe("Theodor");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);
    });
});

describe("ReadAttributeRequestItemDVO with IQL and results", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        runtimeServices1 = runtimeServices[0];
        runtimeServices2 = runtimeServices[1];
        transportServices1 = runtimeServices1.transport;
        transportServices2 = runtimeServices2.transport;
        expander1 = runtimeServices1.expander;
        expander2 = runtimeServices2.expander;
        consumptionServices1 = runtimeServices1.consumption;
        consumptionServices2 = runtimeServices2.consumption;
        eventBus1 = runtimeServices1.eventBus;
        eventBus2 = runtimeServices2.eventBus;
        await establishRelationship(transportServices1, transportServices2);
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        const attribute = await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Theodor"
                }
            }
        });

        requestContent = {
            content: {
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,

                        query: IQLQuery.from({
                            queryString: "GivenName"
                        })
                    }).toJSON()
                ]
            },
            peer: address2
        };
        responseItems = [{ accept: true, newAttribute: attribute.value.content } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON];
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await syncUntilHasMessageWithRequest(transportServices2, senderMessage.content.id);
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const iqlQueryDVO = requestItemDVO.query as IQLQueryDVO;
        expect(iqlQueryDVO.queryString).toBe("GivenName");
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
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
        const requestItemDVO = dvo.request.content.items[0] as DecidableReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIQLQueryDVO");
        const iqlQueryDVO = requestItemDVO.query as ProcessedIQLQueryDVO;
        expect(iqlQueryDVO.results).toHaveLength(1);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const resultItem = iqlQueryDVO.results[0];
        expect(resultItem.type).toBe("RepositoryAttributeDVO");
        expect(resultItem.content["@type"]).toBe("IdentityAttribute");
        expect(resultItem.content.value["@type"]).toBe("GivenName");
        expect((resultItem.content.value as GivenNameJSON).value).toBe("Theodor");
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: recipientMessage.content.id,
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attribute).toBeDefined();
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute.content.value as GivenNameJSON).value).toBe("Theodor");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();

        const displayName = attributeResult.value[0].content.value as GivenNameJSON;
        expect(displayName.value).toBe("Theodor");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(displayName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = await syncAndGetBaselineNumberOfAttributes(runtimeServices1, {
            query: { "content.value.@type": "GivenName", "shareInfo.peer": address2 }
        });
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        const numberOfAttributes = attributeResult.value.length;
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();

        const givenName = attributeResult.value[numberOfAttributes - 1].content.value as GivenNameJSON;
        expect(givenName.value).toBe("Theodor");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);
    });
});

describe("ReadAttributeRequestItemDVO with IQL and fallback", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        runtimeServices1 = runtimeServices[0];
        runtimeServices2 = runtimeServices[1];
        transportServices1 = runtimeServices1.transport;
        transportServices2 = runtimeServices2.transport;
        expander1 = runtimeServices1.expander;
        expander2 = runtimeServices2.expander;
        consumptionServices1 = runtimeServices1.consumption;
        consumptionServices2 = runtimeServices2.consumption;
        eventBus1 = runtimeServices1.eventBus;
        eventBus2 = runtimeServices2.eventBus;
        await establishRelationship(transportServices1, transportServices2);
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        const attribute = await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "Heuss"
                }
            }
        });

        await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Theodor"
                }
            }
        });

        requestContent = {
            content: {
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,

                        query: IQLQuery.from({
                            queryString: "Surname",
                            attributeCreationHints: {
                                valueType: "Surname"
                            }
                        })
                    }).toJSON()
                ]
            },
            peer: address2
        };
        responseItems = [{ accept: true, newAttribute: attribute.value.content } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON];
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        await syncUntilHasMessageWithRequest(transportServices2, senderMessage.content.id);
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const iqlQueryDVO = requestItemDVO.query as IQLQueryDVO;
        expect(iqlQueryDVO.queryString).toBe("Surname");
    });

    test("check the MessageDVO for the recipient", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
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
        const requestItemDVO = dvo.request.content.items[0] as DecidableReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIQLQueryDVO");
        const iqlQueryDVO = requestItemDVO.query as ProcessedIQLQueryDVO;
        expect(iqlQueryDVO.results).toHaveLength(1);

        expect(requestItemDVO.mustBeAccepted).toBe(true);
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
        const recipientMessage = await exchangeMessageWithRequest(runtimeServices1, runtimeServices2, requestContent);
        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: recipientMessage.content.id,
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attribute).toBeDefined();
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("Surname");
        expect((responseItem.attribute.content.value as SurnameJSON).value).toBe("Heuss");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "Surname", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();

        const displayName = attributeResult.value[0].content.value as SurnameJSON;
        expect(displayName.value).toBe("Heuss");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(displayName.value).toStrictEqual((responseItem.attribute.content.value as SurnameJSON).value);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = await syncAndGetBaselineNumberOfAttributes(runtimeServices1, {
            query: { "content.value.@type": "Surname", "shareInfo.peer": address2 }
        });
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IQLQueryDVO");
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(1);
        const responseItem = response!.content.items[0] as ReadAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ReadAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "Surname", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        const numberOfAttributes = attributeResult.value.length;
        expect(numberOfAttributes - baselineNumberOfAttributes).toBe(1);
        expect(attributeResult.value[numberOfAttributes - 1].id).toBeDefined();

        const givenName = attributeResult.value[numberOfAttributes - 1].content.value as SurnameJSON;
        expect(givenName.value).toBe("Heuss");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute.content.value as SurnameJSON).value);
    });
});
