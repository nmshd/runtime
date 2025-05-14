import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    DecideRequestItemParametersJSON
} from "@nmshd/consumption";
import { GivenNameJSON, IdentityAttributeQuery, IQLQuery, ReadAttributeAcceptResponseItemJSON, ReadAttributeRequestItem, RequestJSON, SurnameJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import {
    AttributeAlreadySharedAcceptResponseItemDVO,
    AttributeSuccessionAcceptResponseItemDVO,
    ConsumptionServices,
    CreateOutgoingRequestRequest,
    DataViewExpander,
    IdentityAttributeQueryDVO,
    IncomingRequestStatusChangedEvent,
    IQLQueryDVO,
    LocalRequestStatus,
    OutgoingRequestStatusChangedEvent,
    ProcessedIdentityAttributeQueryDVO,
    ProcessedIQLQueryDVO,
    ReadAttributeAcceptResponseItemDVO,
    ReadAttributeRequestItemDVO,
    RequestMessageDVO,
    TransportServices
} from "../../../src";
import {
    cleanupAttributes,
    establishRelationship,
    exchangeAndAcceptRequestByMessage,
    exchangeMessageWithRequest,
    executeFullCreateAndShareRepositoryAttributeFlow,
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
let consumptionServices1: ConsumptionServices;
let consumptionServices2: ConsumptionServices;
let eventBus1: MockEventBus;
let eventBus2: MockEventBus;
let address2: string;

let requestContent: CreateOutgoingRequestRequest;
let responseItems: DecideRequestItemParametersJSON[];

afterAll(() => serviceProvider.stop());

beforeEach(async function () {
    eventBus1.reset();
    eventBus2.reset();
    await cleanupAttributes([runtimeServices1, runtimeServices2], true);
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

        const repositoryAttribute = (
            await consumptionServices2.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    }
                }
            })
        ).value;

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

        responseItems = [{ accept: true, existingAttributeId: repositoryAttribute.id } as AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON];
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
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
        expect((resultItem.content.value as GivenNameJSON).value).toBe("aGivenName");
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
        expect(responseItem.attribute!.owner).toBe(recipientAddress);
        expect(responseItem.attribute!.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute!.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute!.content.value as GivenNameJSON).value).toBe("aGivenName");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();

        const displayName = attributeResult.value[0].content.value as GivenNameJSON;
        expect(displayName.value).toBe("aGivenName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(displayName.value).toStrictEqual((responseItem.attribute!.content.value as GivenNameJSON).value);

        await syncUntilHasMessageWithResponse(transportServices1, recipientMessage.content.id!);
        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = (await consumptionServices1.attributes.getAttributes({ query: { "content.value.@type": "GivenName", "shareInfo.peer": address2 } }))
            .value.length;
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
        expect(givenName.value).toBe("aGivenName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute!.content.value as GivenNameJSON).value);
    });

    test("check the MessageDVO for the recipient after they deleted the shared Attribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(runtimeServices1, runtimeServices2, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await runtimeServices1.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;

        await runtimeServices2.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: sharedAttributeId });

        const recipientMessage = (await runtimeServices2.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = await expander2.expandMessageDTO(recipientMessage);
        expect(dvo).toBeDefined();
    });

    test("check the MessageDVO for the sender after they deleted the shared Attribute", async () => {
        const senderMessage = await exchangeAndAcceptRequestByMessage(runtimeServices1, runtimeServices2, requestContent, responseItems);
        const requestId = (senderMessage.content as RequestJSON).id!;
        const localRequest = (await runtimeServices1.consumption.outgoingRequests.getRequest({ id: requestId })).value;
        const sharedAttributeId = (localRequest.response!.content.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;

        await runtimeServices1.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: sharedAttributeId });

        const senderMessageAfterDeletion = (await runtimeServices1.transport.messages.getMessage({ id: senderMessage.id })).value;
        const dvo = await expander1.expandMessageDTO(senderMessageAfterDeletion);
        expect(dvo).toBeDefined();
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
                    value: "aGivenName"
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
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
        expect((resultItem.content.value as GivenNameJSON).value).toBe("aGivenName");
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
        expect(responseItem.attribute!.owner).toBe(recipientAddress);
        expect(responseItem.attribute!.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute!.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute!.content.value as GivenNameJSON).value).toBe("aGivenName");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const attributeResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(1);
        expect(attributeResult.value[0].id).toBeDefined();

        const displayName = attributeResult.value[0].content.value as GivenNameJSON;
        expect(displayName.value).toBe("aGivenName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[0].id);
        expect(displayName.value).toStrictEqual((responseItem.attribute!.content.value as GivenNameJSON).value);

        await syncUntilHasMessageWithResponse(transportServices1, recipientMessage.content.id!);
        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = (await consumptionServices1.attributes.getAttributes({ query: { "content.value.@type": "GivenName", "shareInfo.peer": address2 } }))
            .value.length;
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
        expect(givenName.value).toBe("aGivenName");

        expect(responseItem.attributeId).toStrictEqual(attributeResult.value[numberOfAttributes - 1].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute!.content.value as GivenNameJSON).value);
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
                    value: "aGivenName"
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
        const requestItemDVO = dvo.request.content.items[0] as ReadAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ReadAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIQLQueryDVO");
        const iqlQueryDVO = requestItemDVO.query as ProcessedIQLQueryDVO;
        expect(iqlQueryDVO.results).toHaveLength(1);

        expect(requestItemDVO.mustBeAccepted).toBe(true);
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
        expect(responseItem.attribute!.owner).toBe(recipientAddress);
        expect(responseItem.attribute!.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute!.content.value["@type"]).toBe("Surname");
        expect((responseItem.attribute!.content.value as SurnameJSON).value).toBe("Heuss");
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
        expect(displayName.value).toStrictEqual((responseItem.attribute!.content.value as SurnameJSON).value);

        await syncUntilHasMessageWithResponse(transportServices1, recipientMessage.content.id!);
        await eventBus1.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.Completed);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        const baselineNumberOfAttributes = (await consumptionServices1.attributes.getAttributes({ query: { "content.value.@type": "Surname", "shareInfo.peer": address2 } })).value
            .length;
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
        expect(givenName.value).toStrictEqual((responseItem.attribute!.content.value as SurnameJSON).value);
    });
});

describe("AttributeSuccessionAcceptResponseItemDVO with IdentityAttributeQuery", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true });
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
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        await establishRelationship(transportServices1, transportServices2);

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
    });

    beforeEach(async () => {
        const predecessorOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(runtimeServices2, runtimeServices1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["predecessor"]
            }
        });
        const predecessorRepositoryAttribute = (await consumptionServices2.attributes.getAttribute({ id: predecessorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute! }))
            .value;

        const { successor: successorRepositoryAttribute } = (
            await consumptionServices2.attributes.succeedRepositoryAttribute({
                predecessorId: predecessorRepositoryAttribute.id,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "Franz"
                    },
                    tags: ["successor"]
                }
            })
        ).value;

        responseItems = [{ accept: true, existingAttributeId: successorRepositoryAttribute.id } as AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON];
    }, 30000);

    afterEach(async () => {
        await Promise.all(
            [runtimeServices1, runtimeServices2].map(async (services) => {
                const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

                const servicesAttributesResult = await services.consumption.attributes.getAttributes({});
                for (const attribute of servicesAttributesResult.value) {
                    await servicesAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
                }
            })
        );
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
        const responseItem = response!.content.items[0] as AttributeSuccessionAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("AttributeSuccessionAcceptResponseItemDVO");

        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.predecessor).toBeDefined();
        expect(responseItem.predecessor.owner).toBe(recipientAddress);
        expect(responseItem.predecessor.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.predecessor.content.value["@type"]).toBe("GivenName");
        expect((responseItem.predecessor.content.value as GivenNameJSON).value).toBe("aGivenName");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        expect(responseItem.successor).toBeDefined();
        expect(responseItem.successor.owner).toBe(recipientAddress);
        expect(responseItem.successor.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.successor.content.value["@type"]).toBe("GivenName");
        expect((responseItem.successor.content.value as GivenNameJSON).value).toBe("Franz");

        const predecessorResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id, "content.tags": "predecessor" }
        });
        expect(predecessorResult).toBeSuccessful();
        expect(predecessorResult.value).toHaveLength(1);
        expect(predecessorResult.value[0].id).toBeDefined();
        const predecessorName = predecessorResult.value[0].content.value as GivenNameJSON;
        expect(predecessorName.value).toBe("aGivenName");
        expect(responseItem.predecessorId).toStrictEqual(predecessorResult.value[0].id);
        expect(predecessorName.value).toStrictEqual((responseItem.predecessor.content.value as GivenNameJSON).value);

        const successorResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id, "content.tags": "successor" }
        });
        expect(successorResult).toBeSuccessful();
        expect(successorResult.value).toHaveLength(1);
        expect(successorResult.value[0].id).toBeDefined();
        const successorName = successorResult.value[0].content.value as GivenNameJSON;
        expect(successorName.value).toBe("Franz");
        expect(responseItem.successorId).toStrictEqual(successorResult.value[0].id);
        expect(successorName.value).toStrictEqual((responseItem.successor.content.value as GivenNameJSON).value);

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
        const responseItem = response!.content.items[0] as AttributeSuccessionAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("AttributeSuccessionAcceptResponseItemDVO");

        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.predecessor).toBeDefined();
        expect(responseItem.predecessor.owner).toBe(recipientAddress);
        expect(responseItem.predecessor.type).toBe("PeerAttributeDVO");
        expect(responseItem.predecessor.content.value["@type"]).toBe("GivenName");
        expect((responseItem.predecessor.content.value as GivenNameJSON).value).toBe("aGivenName");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        expect(responseItem.successor).toBeDefined();
        expect(responseItem.successor.owner).toBe(recipientAddress);
        expect(responseItem.successor.type).toBe("PeerAttributeDVO");
        expect(responseItem.successor.content.value["@type"]).toBe("GivenName");
        expect((responseItem.successor.content.value as GivenNameJSON).value).toBe("Franz");

        const predecessorResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.request.peer.id, "content.tags": "predecessor" }
        });
        expect(predecessorResult).toBeSuccessful();
        expect(predecessorResult.value).toHaveLength(1);
        expect(predecessorResult.value[0].id).toBeDefined();
        const predecessorName = predecessorResult.value[0].content.value as GivenNameJSON;
        expect(predecessorName.value).toBe("aGivenName");
        expect(responseItem.predecessorId).toStrictEqual(predecessorResult.value[0].id);
        expect(predecessorName.value).toStrictEqual((responseItem.predecessor.content.value as GivenNameJSON).value);

        const successorResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.request.peer.id, "content.tags": "successor" }
        });
        expect(successorResult).toBeSuccessful();
        expect(successorResult.value).toHaveLength(1);
        expect(successorResult.value[0].id).toBeDefined();
        const successorName = successorResult.value[0].content.value as GivenNameJSON;
        expect(successorName.value).toBe("Franz");
        expect(responseItem.successorId).toStrictEqual(successorResult.value[0].id);
        expect(successorName.value).toStrictEqual((responseItem.successor.content.value as GivenNameJSON).value);
    });
});

describe("AttributeAlreadySharedAcceptResponseItemDVO with IdentityAttributeQuery", () => {
    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true });
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
        address2 = (await transportServices2.account.getIdentityInfo()).value.address;

        await establishRelationship(transportServices1, transportServices2);

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
    });

    beforeEach(async () => {
        const alreadySharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(runtimeServices2, runtimeServices1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                }
            }
        });
        const repositoryAttribute = (await consumptionServices2.attributes.getAttribute({ id: alreadySharedIdentityAttribute.shareInfo!.sourceAttribute! })).value;

        responseItems = [{ accept: true, existingAttributeId: repositoryAttribute.id } as AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON];
    }, 30000);

    afterEach(async () => {
        await Promise.all(
            [runtimeServices1, runtimeServices2].map(async (services) => {
                const servicesAttributeController = services.consumption.attributes["getAttributeUseCase"]["attributeController"];

                const servicesAttributesResult = await services.consumption.attributes.getAttributes({});
                for (const attribute of servicesAttributesResult.value) {
                    await servicesAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
                }
            })
        );
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
        const responseItem = response!.content.items[0] as AttributeAlreadySharedAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("AttributeAlreadySharedAcceptResponseItemDVO");

        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute.content.value as GivenNameJSON).value).toBe("aGivenName");
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
        const responseItem = response!.content.items[0] as AttributeAlreadySharedAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("AttributeAlreadySharedAcceptResponseItemDVO");

        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute).toBeDefined();
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("PeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute.content.value as GivenNameJSON).value).toBe("aGivenName");
        expect(requestItemDVO.response).toStrictEqual(responseItem);
    });
});
