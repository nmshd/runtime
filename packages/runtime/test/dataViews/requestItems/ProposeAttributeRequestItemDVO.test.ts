import { AcceptProposeAttributeRequestItemParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import { AbstractStringJSON, GivenName, GivenNameJSON, IdentityAttribute, IdentityAttributeQuery, ProposeAttributeRequestItem, Surname, SurnameJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import {
    ConsumptionServices,
    DataViewExpander,
    DecidableProposeAttributeRequestItemDVO,
    IdentityAttributeQueryDVO,
    IncomingRequestStatusChangedEvent,
    MessageDTO,
    OutgoingRequestStatusChangedEvent,
    ProcessedIdentityAttributeQueryDVO,
    ProposeAttributeAcceptResponseItemDVO,
    ProposeAttributeRequestItemDVO,
    RequestMessageDVO,
    TransportServices
} from "../../../src";
import { establishRelationship, MockEventBus, RuntimeServiceProvider, sendMessage, syncUntilHasMessages, syncUntilHasMessageWithRequest } from "../../lib";

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
            value: {
                "@type": "GivenName",
                value: "Marlene"
            }
        }
    });

    await consumptionServices2.attributes.createRepositoryAttribute({
        content: {
            value: {
                "@type": "Surname",
                value: "Weigl"
            }
        }
    });

    const localRequest = await consumptionServices1.outgoingRequests.create({
        content: {
            items: [
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,

                    query: IdentityAttributeQuery.from({
                        valueType: "GivenName"
                    }),
                    attribute: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: GivenName.from("Theodor")
                    })
                }).toJSON(),
                ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,

                    query: IdentityAttributeQuery.from({
                        valueType: "Surname"
                    }),
                    attribute: IdentityAttribute.from({
                        owner: CoreAddress.from(""),
                        value: Surname.from("Weigl-Rostock")
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

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    eventBus1.reset();
    eventBus2.reset();
});

describe("ProposeAttributeRequestItemDVO", () => {
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
        expect(dvo.request.content.items).toHaveLength(2);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as ProposeAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ProposeAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as IdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.attribute).toBeDefined();
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("Theodor");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(false);
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
        expect(dvo.request.content.items).toHaveLength(2);
        expect(dvo.request.isDecidable).toBe(true);
        let requestItemDVO = dvo.request.content.items[0] as DecidableProposeAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableProposeAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);
        expect((requestItemDVO as any)["proposedValueOverruled"]).toBeUndefined();

        expect(requestItemDVO.attribute).toBeDefined();
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const givenNameValue = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(givenNameValue["@type"]).toBe("GivenName");
        expect(givenNameValue.value).toBe("Theodor");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(true);

        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIdentityAttributeQueryDVO");
        let identityAttributeQueryDVO = requestItemDVO.query as ProcessedIdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.results).toHaveLength(1);
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const resultItem = identityAttributeQueryDVO.results[0];
        expect(resultItem.type).toBe("RepositoryAttributeDVO");
        expect(resultItem.content["@type"]).toBe("IdentityAttribute");
        expect(resultItem.content.value["@type"]).toBe("GivenName");
        expect((resultItem.content.value as GivenNameJSON).value).toBe("Marlene");

        requestItemDVO = dvo.request.content.items[1] as DecidableProposeAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("DecidableProposeAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(true);

        expect(requestItemDVO.attribute).toBeDefined();
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Surname");
        expect(value.value).toBe("Weigl-Rostock");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(true);

        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("ProcessedIdentityAttributeQueryDVO");
        identityAttributeQueryDVO = requestItemDVO.query as ProcessedIdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.results).toHaveLength(1);
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        const resultItem2 = identityAttributeQueryDVO.results[0];
        expect(resultItem2.type).toBe("RepositoryAttributeDVO");
        expect(resultItem2.content["@type"]).toBe("IdentityAttribute");
        expect(resultItem2.content.value["@type"]).toBe("Surname");
        expect((resultItem2.content.value as SurnameJSON).value).toBe("Weigl");

        const givenNameRepositoryResult = await consumptionServices2.attributes.getAttributes({
            query: { shareInfo: "!", "content.value.@type": "GivenName" }
        });
        expect(givenNameRepositoryResult.value).toHaveLength(1);

        const acceptResult = await consumptionServices2.incomingRequests.accept({
            requestId: dvo.request.id,
            items: [
                { accept: true, attributeId: resultItem.id } as AcceptProposeAttributeRequestItemParametersJSON,
                { accept: true, attribute: requestItemDVO.attribute.content } as AcceptProposeAttributeRequestItemParametersJSON
            ]
        });
        expect(acceptResult).toBeSuccessful();

        const givenNameRepositoryResult2 = await consumptionServices2.attributes.getAttributes({
            query: { shareInfo: "!", "content.value.@type": "GivenName" }
        });
        expect(givenNameRepositoryResult2.value).toHaveLength(1);
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
        expect(dvo.request.content.items).toHaveLength(2);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as ProposeAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ProposeAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");

        const identityAttributeQueryDVO = requestItemDVO.query as ProcessedIdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);
        expect(requestItemDVO.proposedValueOverruled).toBe(true);

        expect(requestItemDVO.attribute).toBeDefined();
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("Theodor");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(true);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(2);
        const responseItem = response!.content.items[0] as ProposeAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ProposeAttributeAcceptResponseItemDVO");
        expect(responseItem.attribute).toBeDefined();
        const recipientAddress = (await transportServices2.account.getIdentityInfo()).value.address;
        expect(responseItem.attribute.owner).toBe(recipientAddress);
        expect(responseItem.attribute.type).toBe("SharedToPeerAttributeDVO");
        expect(responseItem.attribute.content.value["@type"]).toBe("GivenName");
        expect((responseItem.attribute.content.value as GivenNameJSON).value).toBe("Marlene");
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const givenNameRepositoryResult = await consumptionServices2.attributes.getAttributes({
            query: {
                shareInfo: "!",
                "content.value.@type": "GivenName"
            }
        });
        expect(givenNameRepositoryResult.value).toHaveLength(1);

        const surnameRepositoryResult = await consumptionServices2.attributes.getAttributes({ query: { shareInfo: "!", "content.value.@type": "Surname" } });
        expect(surnameRepositoryResult.value).toHaveLength(2);

        const givenNameShareResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(givenNameShareResult).toBeSuccessful();
        expect(givenNameShareResult.value).toHaveLength(1);

        const givenName = givenNameShareResult.value[0].content.value as GivenNameJSON;
        expect(givenName.value).toBe("Marlene");
        expect(responseItem.attributeId).toStrictEqual(givenNameShareResult.value[0].id);

        const responseItem2 = response!.content.items[1] as ProposeAttributeAcceptResponseItemDVO;
        expect(responseItem2.result).toBe("Accepted");
        expect(responseItem2.type).toBe("ProposeAttributeAcceptResponseItemDVO");
        expect(responseItem2.attribute).toBeDefined();

        expect(givenName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);

        const surnameRequestItem = dvo.request.content.items[1] as ProposeAttributeRequestItemDVO;
        expect(surnameRequestItem.proposedValueOverruled).toBe(false);

        const surnameShareResult = await consumptionServices2.attributes.getAttributes({
            query: { "content.value.@type": "Surname", "shareInfo.peer": dvo.createdBy.id }
        });
        expect(surnameShareResult).toBeSuccessful();
        expect(surnameShareResult.value).toHaveLength(1);
        expect(surnameShareResult.value[0].id).toBeDefined();

        const surname = surnameShareResult.value[0].content.value as SurnameJSON;
        expect(surname.value).toBe("Weigl-Rostock");

        expect(responseItem2.attributeId).toStrictEqual(surnameShareResult.value[0].id);
        expect(surname.value).toStrictEqual((responseItem2.attribute.content.value as SurnameJSON).value);
    });

    test("check the MessageDVO for the sender after acceptance", async () => {
        await syncUntilHasMessages(transportServices1, 1);

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
        expect(dvo.request.content.items).toHaveLength(2);
        expect(dvo.request.isDecidable).toBe(false);
        const requestItemDVO = dvo.request.content.items[0] as ProposeAttributeRequestItemDVO;
        expect(requestItemDVO.type).toBe("ProposeAttributeRequestItemDVO");
        expect(requestItemDVO.isDecidable).toBe(false);
        expect(requestItemDVO.query).toBeDefined();
        expect(requestItemDVO.query.type).toBe("IdentityAttributeQueryDVO");
        const identityAttributeQueryDVO = requestItemDVO.query as IdentityAttributeQueryDVO;
        expect(identityAttributeQueryDVO.renderHints.technicalType).toBe("String");
        expect(identityAttributeQueryDVO.renderHints.editType).toBe("InputLike");
        expect(identityAttributeQueryDVO.valueHints.max).toBe(100);
        expect(requestItemDVO.mustBeAccepted).toBe(true);

        expect(requestItemDVO.attribute).toBeDefined();
        expect(requestItemDVO.attribute.type).toBe("DraftIdentityAttributeDVO");
        const value = requestItemDVO.attribute.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("Theodor");
        expect(requestItemDVO.attribute.renderHints.editType).toBe("InputLike");
        expect(requestItemDVO.attribute.valueHints.max).toBe(100);
        expect(requestItemDVO.attribute.isDraft).toBe(true);
        expect(requestItemDVO.attribute.isOwn).toBe(false);

        const response = dvo.request.response;
        expect(response).toBeDefined();
        expect(response!.type).toBe("LocalResponseDVO");
        expect(response!.name).toBe("i18n://dvo.localResponse.name");
        expect(response!.date).toBeDefined();
        expect(response!.content.result).toBe("Accepted");
        expect(response!.content.items).toHaveLength(2);
        const responseItem = response!.content.items[0] as ProposeAttributeAcceptResponseItemDVO;
        expect(responseItem.result).toBe("Accepted");
        expect(responseItem.type).toBe("ProposeAttributeAcceptResponseItemDVO");
        expect(responseItem.attributeId).toBeDefined();
        expect(responseItem.attribute).toBeDefined();
        expect(requestItemDVO.response).toStrictEqual(responseItem);

        const responseItem2 = response!.content.items[1] as ProposeAttributeAcceptResponseItemDVO;
        expect(responseItem2.result).toBe("Accepted");
        expect(responseItem2.type).toBe("ProposeAttributeAcceptResponseItemDVO");
        expect(responseItem2.attributeId).toBeDefined();
        expect(responseItem2.attribute).toBeDefined();

        const givenNameResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "GivenName", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(givenNameResult).toBeSuccessful();
        expect(givenNameResult.value[0].id).toBeDefined();
        const givenName = givenNameResult.value[0].content.value as GivenNameJSON;
        expect(givenName.value).toBe("Marlene");

        expect(responseItem.attributeId).toStrictEqual(givenNameResult.value[0].id);
        expect(givenName.value).toStrictEqual((responseItem.attribute.content.value as GivenNameJSON).value);

        const surnameResult = await consumptionServices1.attributes.getAttributes({
            query: { "content.value.@type": "Surname", "shareInfo.peer": dvo.request.peer.id }
        });
        expect(surnameResult).toBeSuccessful();
        expect(surnameResult.value[0].id).toBeDefined();

        const surname = surnameResult.value[0].content.value as SurnameJSON;
        expect(surname.value).toBe("Weigl-Rostock");

        expect(responseItem2.attributeId).toStrictEqual(surnameResult.value[0].id);
        expect(surname.value).toStrictEqual((responseItem2.attribute.content.value as SurnameJSON).value);
    });
});
