import { AcceptReadAttributeRequestItemParametersWithNewAttributeJSON, LocalRequestStatus } from "@nmshd/consumption";
import { IdentityAttributeQuery, IQLQuery, PersonName, PersonNameJSON, ReadAttributeRequestItem } from "@nmshd/content";
import {
    ConsumptionServices,
    DataViewExpander,
    DecidableReadAttributeRequestItemDVO,
    IdentityAttributeQueryDVO,
    IncomingRequestStatusChangedEvent,
    IQLQueryDVO,
    MessageDTO,
    OutgoingRequestStatusChangedEvent,
    ProcessedIdentityAttributeQueryDVO,
    ProcessedIQLQueryDVO,
    ReadAttributeAcceptResponseItemDVO,
    ReadAttributeRequestItemDVO,
    RequestMessageDVO,
    TransportServices
} from "../../../src";
import { establishRelationship, MockEventBus, RuntimeServiceProvider, sendMessage, syncUntilHasMessageWithRequest, syncUntilHasMessageWithResponse } from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;
let expander1: DataViewExpander;
let expander2: DataViewExpander;
let consumptionServices1: ConsumptionServices;
let consumptionServices2: ConsumptionServices;
let eventBus1: MockEventBus;
let eventBus2: MockEventBus;
let senderMessage: MessageDTO;
let recipientMessage: MessageDTO;
let requestId: string;

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    eventBus1.reset();
    eventBus2.reset();
});

describe("ComplexReadAttributeRequestItemDVO with IdentityAttributeQuery", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        transportServices1 = runtimeServices[0].transport;
        transportServices2 = runtimeServices[1].transport;
        expander1 = runtimeServices[0].expander;
        expander2 = runtimeServices[1].expander;
        consumptionServices1 = runtimeServices[0].consumption;
        consumptionServices2 = runtimeServices[1].consumption;
        eventBus1 = runtimeServices[0].eventBus;
        eventBus2 = runtimeServices[1].eventBus;
        await establishRelationship(transportServices1, transportServices2);
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;

        await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: PersonName.from({
                    honorificPrefix: "Dr.",
                    givenName: "Heinz",
                    middleName: "Gerhard",
                    surname: "Ranzig",
                    honorificSuffix: "von Warnermünde"
                }).toJSON()
            }
        });

        const localRequest = await consumptionServices1.outgoingRequests.create({
            content: {
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,

                        query: IdentityAttributeQuery.from({
                            valueType: "PersonName"
                        })
                    }).toJSON()
                ]
            },
            peer: recipientAddress
        });

        senderMessage = await sendMessage(transportServices1, recipientAddress, localRequest.value.content);
        recipientMessage = await syncUntilHasMessageWithRequest(transportServices2, localRequest.value.id);

        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
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
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("Object");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("Complex");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.propertyHints!["surname"].max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
    });

    test("check the MessageDVO for the recipient and accept it", async () => {
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
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("Object");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("Complex");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.propertyHints!["surname"].max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        const resultItem = identityAttributeQueryDVO.results[0];
        expect(resultItem.type).toBe("RepositoryAttributeDVO");
        expect(resultItem.content["@type"]).toBe("IdentityAttribute");
        expect(resultItem.content.value["@type"]).toBe("PersonName");
        expect((resultItem.content.value as PersonNameJSON).givenName).toBe("Heinz");
        expect((resultItem.content.value as PersonNameJSON).surname).toBe("Ranzig");
        expect((resultItem.content.value as PersonNameJSON).middleName).toBe("Gerhard");
        expect((resultItem.content.value as PersonNameJSON).honorificPrefix).toBe("Dr.");
        expect((resultItem.content.value as PersonNameJSON).honorificSuffix).toBe("von Warnermünde");

        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: dvo.request.id,
            items: [{ accept: true, newAttribute: resultItem.content } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON]
        });
        expect(acceptResult).toBeSuccessful();
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
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
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("Object");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("Complex");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.propertyHints!["surname"].max).toBe(100);
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

        const attributeValue = responseItem.attribute.value as PersonNameJSON;
        expect(attributeValue["@type"]).toBe("PersonName");
        expect(attributeValue.givenName).toBe("Heinz");
        expect(attributeValue.surname).toBe("Ranzig");
        expect(attributeValue.middleName).toBe("Gerhard");
        expect(attributeValue.honorificPrefix).toBe("Dr.");
        expect(attributeValue.honorificSuffix).toBe("von Warnermünde");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "PersonName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const returnedValue = attributeResult.value[0].content.value as PersonNameJSON;
        expect(returnedValue["@type"]).toBe("PersonName");
        expect(returnedValue.givenName).toBe("Heinz");
        expect(returnedValue.surname).toBe("Ranzig");
        expect(returnedValue.middleName).toBe("Gerhard");
        expect(returnedValue.honorificPrefix).toBe("Dr.");
        expect(returnedValue.honorificSuffix).toBe("von Warnermünde");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(returnedValue).toStrictEqual(attributeValue);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        await syncUntilHasMessageWithResponse(transportServices1, requestId);

        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent);

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
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("Object");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("Complex");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.propertyHints!["surname"].editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.propertyHints!["surname"].max).toBe(100);

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
            query: { "content.value.@type": "PersonName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const returnedValue = attributeResult.value[0].content.value as PersonNameJSON;
        expect(returnedValue["@type"]).toBe("PersonName");
        expect(returnedValue.givenName).toBe("Heinz");
        expect(returnedValue.surname).toBe("Ranzig");
        expect(returnedValue.middleName).toBe("Gerhard");
        expect(returnedValue.honorificPrefix).toBe("Dr.");
        expect(returnedValue.honorificSuffix).toBe("von Warnermünde");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(returnedValue).toStrictEqual(responseItem.attribute.content.value);
    });
});

describe("ComplexReadAttributeRequestItemDVO with IQL", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
        transportServices1 = runtimeServices[0].transport;
        transportServices2 = runtimeServices[1].transport;
        expander1 = runtimeServices[0].expander;
        expander2 = runtimeServices[1].expander;
        consumptionServices1 = runtimeServices[0].consumption;
        consumptionServices2 = runtimeServices[1].consumption;
        eventBus1 = runtimeServices[0].eventBus;
        eventBus2 = runtimeServices[1].eventBus;
        await establishRelationship(transportServices1, transportServices2);
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;

        await consumptionServices2.attributes.createRepositoryAttribute({
            content: {
                value: PersonName.from({
                    honorificPrefix: "Dr.",
                    givenName: "Heinz",
                    middleName: "Gerhard",
                    surname: "Ranzig",
                    honorificSuffix: "von Warnermünde"
                }).toJSON()
            }
        });

        const localRequest = await consumptionServices1.outgoingRequests.create({
            content: {
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,

                        query: IQLQuery.from({
                            queryString: "PersonName"
                        })
                    }).toJSON()
                ]
            },
            peer: recipientAddress
        });
        requestId = localRequest.value.id;

        senderMessage = await sendMessage(transportServices1, recipientAddress, localRequest.value.content);
        recipientMessage = await syncUntilHasMessageWithRequest(transportServices2, localRequest.value.id);

        await eventBus2.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
    }, 30000);

    test("check the MessageDVO for the sender", async () => {
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
        expect(iqlQueryDVO.queryString).toBe("PersonName");
    });

    test("check the MessageDVO for the recipient and accept it", async () => {
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
        expect(resultItem.content.value["@type"]).toBe("PersonName");
        expect((resultItem.content.value as PersonNameJSON).givenName).toBe("Heinz");
        expect((resultItem.content.value as PersonNameJSON).surname).toBe("Ranzig");
        expect((resultItem.content.value as PersonNameJSON).middleName).toBe("Gerhard");
        expect((resultItem.content.value as PersonNameJSON).honorificPrefix).toBe("Dr.");
        expect((resultItem.content.value as PersonNameJSON).honorificSuffix).toBe("von Warnermünde");

        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: dvo.request.id,
            items: [{ accept: true, newAttribute: resultItem.content } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON]
        });
        expect(acceptResult).toBeSuccessful();
    });

    test("check the MessageDVO for the recipient after acceptance", async () => {
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

        const attributeValue = responseItem.attribute.value as PersonNameJSON;
        expect(attributeValue["@type"]).toBe("PersonName");
        expect(attributeValue.givenName).toBe("Heinz");
        expect(attributeValue.surname).toBe("Ranzig");
        expect(attributeValue.middleName).toBe("Gerhard");
        expect(attributeValue.honorificPrefix).toBe("Dr.");
        expect(attributeValue.honorificSuffix).toBe("von Warnermünde");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "PersonName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const returnedValue = attributeResult.value[0].content.value as PersonNameJSON;
        expect(returnedValue["@type"]).toBe("PersonName");
        expect(returnedValue.givenName).toBe("Heinz");
        expect(returnedValue.surname).toBe("Ranzig");
        expect(returnedValue.middleName).toBe("Gerhard");
        expect(returnedValue.honorificPrefix).toBe("Dr.");
        expect(returnedValue.honorificSuffix).toBe("von Warnermünde");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(returnedValue).toStrictEqual(attributeValue);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        await syncUntilHasMessageWithResponse(transportServices1, requestId);

        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent);

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
            query: { "content.value.@type": "PersonName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value[0].id).toBeDefined();

        const returnedValue = attributeResult.value[0].content.value as PersonNameJSON;
        expect(returnedValue["@type"]).toBe("PersonName");
        expect(returnedValue.givenName).toBe("Heinz");
        expect(returnedValue.surname).toBe("Ranzig");
        expect(returnedValue.middleName).toBe("Gerhard");
        expect(returnedValue.honorificPrefix).toBe("Dr.");
        expect(returnedValue.honorificSuffix).toBe("von Warnermünde");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(returnedValue).toStrictEqual(responseItem.attribute.content.value);
    });
});
