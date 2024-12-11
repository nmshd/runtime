import { ConsumptionIds, DecideRequestItemParametersJSON } from "@nmshd/consumption";
import {
    ArbitraryMessageContent,
    GivenName,
    IdentityAttribute,
    MailJSON,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipCreationContent,
    RelationshipTemplateContent,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { CoreIdHelper } from "@nmshd/transport";
import { MailDVO, RequestMessageDVO, SendMessageRequest } from "../../src";
import {
    establishRelationshipWithContents,
    exchangeAndAcceptRequestByMessage,
    getRelationship,
    RuntimeServiceProvider,
    syncUntilHasMessage,
    TestRuntimeServices,
    uploadFile
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    await establishRelationshipWithContents(
        services1.transport,
        services2.transport,
        RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: {
                            "@type": "IdentityAttributeQuery",
                            valueType: "CommunicationLanguage"
                        }
                    })
                ]
            }
        }).toJSON(),
        RelationshipCreationContent.from({
            response: {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: (await CoreIdHelper.notPrefixed.generate()).toString(),
                items: [
                    ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: await CoreIdHelper.notPrefixed.generate(),
                        attribute: IdentityAttribute.from({
                            owner: CoreAddress.from((await services1.transport.account.getIdentityInfo()).value.address),
                            value: GivenName.from("aGivenName")
                        })
                    }).toJSON()
                ]
            }
        }).toJSON()
    );
}, 30000);

afterAll(() => serviceProvider.stop());

describe("Message with Mail", () => {
    let transportService2Address: string;
    let fileId: string;
    let messageRequest: SendMessageRequest;
    let mailRequest: SendMessageRequest;

    beforeAll(async () => {
        const file = await uploadFile(services1.transport);
        fileId = file.id;

        const relationship = await getRelationship(services1.transport);
        transportService2Address = relationship.peer;

        messageRequest = {
            recipients: [transportService2Address],
            content: ArbitraryMessageContent.from({
                value: {
                    arbitraryValue: true
                }
            }).toJSON(),
            attachments: [fileId]
        };
        mailRequest = {
            recipients: [transportService2Address],
            content: {
                "@type": "Mail",
                body: "This is a Mail.",
                cc: [],
                subject: "Mail Subject",
                to: [transportService2Address]
            },
            attachments: [fileId]
        };
    });

    test("check the message dvo for the sender", async () => {
        const dto = (await services1.transport.messages.sendMessage(messageRequest)).value;
        const dvo = await services1.expander.expandMessageDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("MessageDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.createdBy.isSelf).toBe(true);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.unknown");
        expect(recipient.isSelf).toBe(false);
        expect(dvo.status).toBe("Delivering");
    });

    test("check the message dvo for the recipient", async () => {
        const senderMessage = (await services1.transport.messages.sendMessage(messageRequest)).value;
        const messageId = senderMessage.id;
        const dto = await syncUntilHasMessage(services2.transport, messageId);
        const dvo = await services2.expander.expandMessageDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.id).toStrictEqual(messageId);
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("MessageDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.isSelf).toBe(false);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.isSelf).toBe(true);
        expect(dvo.status).toBe("Received");
    });

    test("check the mail dvo for the sender", async () => {
        const dto = (await services1.transport.messages.sendMessage(mailRequest)).value;
        const dvo = (await services1.expander.expandMessageDTO(dto)) as MailDVO;
        expect(dto.content["@type"]).toBe("Mail");
        const mail = dto.content as MailJSON;
        expect(dvo).toBeDefined();
        expect(dvo.name).toBe("Mail Subject");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("MailDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.createdBy.description).toBe("i18n://dvo.identity.self.description");
        expect(dvo.createdBy.initials).toBe("i18n://dvo.identity.self.initials");
        expect(dvo.createdBy.isSelf).toBe(true);

        expect(dvo.recipients).toHaveLength(1);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.unknown");
        expect(recipient.isSelf).toBe(false);

        expect(dvo.to).toHaveLength(1);
        const to = dvo.to[0];
        expect(to.type).toBe("RecipientDVO");
        expect(to.id).toStrictEqual(mail.to[0]);
        expect(to.name).toBe("i18n://dvo.identity.unknown");
        expect(to.isSelf).toBe(false);
        expect(dvo.toCount).toStrictEqual(mail.to.length);
        expect(dvo.ccCount).toStrictEqual(mail.cc!.length);
        expect(dvo.subject).toStrictEqual(mail.subject);
        expect(dvo.body).toStrictEqual(mail.body);
    });

    test("check the mail dvo for the recipient", async () => {
        const senderMail = (await services1.transport.messages.sendMessage(mailRequest)).value;
        const mailId = senderMail.id;
        const dto = await syncUntilHasMessage(services2.transport, mailId);
        const dvo = (await services2.expander.expandMessageDTO(dto)) as MailDVO;
        expect(dto.content["@type"]).toBe("Mail");
        const mail = dto.content as MailJSON;
        expect(dvo).toBeDefined();
        expect(dvo.id).toStrictEqual(mailId);
        expect(dvo.name).toBe("Mail Subject");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("MailDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.isSelf).toBe(false);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.description).toBe("i18n://dvo.identity.self.description");
        expect(recipient.initials).toBe("i18n://dvo.identity.self.initials");
        expect(recipient.isSelf).toBe(true);

        expect(dvo.to).toHaveLength(1);
        const to = dvo.to[0];
        expect(to.type).toBe("RecipientDVO");
        expect(to.id).toStrictEqual(mail.to[0]);
        expect(to.name).toBe("i18n://dvo.identity.self.name");
        expect(to.isSelf).toBe(true);
        expect(dvo.toCount).toStrictEqual(mail.to.length);
        expect(dvo.ccCount).toStrictEqual(mail.cc!.length);
        expect(dvo.subject).toStrictEqual(mail.subject);
        expect(dvo.body).toStrictEqual(mail.body);
    });
});

describe.only("Message with Request", () => {
    let requestMessage: SendMessageRequest;
    let responseItems: DecideRequestItemParametersJSON[];

    beforeAll(() => {
        // TODO: create LocalRequest
        requestMessage = {
            recipients: [services2.address],
            content: {
                "@type": "Request",
                id: ConsumptionIds.request.generate(),
                title: "Request title",
                items: [
                    {
                        "@type": "ConsentRequestItem",
                        consent: "Consent text",
                        mustBeAccepted: true
                    }
                ]
            }
        };

        responseItems = [{ accept: true }];
    });

    test("check the MessageDVO of the Request for the sender", async () => {
        const result = await services1.transport.messages.sendMessage(requestMessage);
        const dto = (await services1.transport.messages.sendMessage(requestMessage)).value;
        const dvo = (await services1.expander.expandMessageDTO(dto)) as RequestMessageDVO;
        expect(dto.content["@type"]).toBe("Request");
        expect(dvo).toBeDefined();
        expect(dvo.name).toBe("Request title");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("RequestDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.createdBy.description).toBe("i18n://dvo.identity.self.description");
        expect(dvo.createdBy.initials).toBe("i18n://dvo.identity.self.initials");
        expect(dvo.createdBy.isSelf).toBe(true);

        expect(dvo.recipients).toHaveLength(1);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.unknown");
        expect(recipient.isSelf).toBe(false);
    });

    test("check the MessageDVO of the Request for the recipient before deciding", async () => {
        const messageDTO = (await services1.transport.messages.sendMessage(requestMessage)).value;
        const messageId = messageDTO.id;
        const dto = await syncUntilHasMessage(services2.transport, messageId);
        expect(dto.content["@type"]).toBe("RequestDVO");

        const dvo = (await services2.expander.expandMessageDTO(dto)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toStrictEqual(messageId);
        expect(dvo.name).toBe("Request title");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("RequestDVO");
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.isSelf).toBe(false);

        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.description).toBe("i18n://dvo.identity.self.description");
        expect(recipient.initials).toBe("i18n://dvo.identity.self.initials");
        expect(recipient.isSelf).toBe(true);

        // const request = dto.content as RequestJSON;
        // expect(dvo.to).toHaveLength(1);
        // const to = dvo.to[0];
        // expect(to.type).toBe("RecipientDVO");
        // expect(to.id).toStrictEqual(request.to[0]);
        // expect(to.name).toBe("i18n://dvo.identity.self.name");
        // expect(to.isSelf).toBe(true);
        // expect(dvo.toCount).toStrictEqual(request.to.length);
        // expect(dvo.ccCount).toStrictEqual(request.cc!.length);
        // expect(dvo.subject).toStrictEqual(request.subject);
        // expect(dvo.body).toStrictEqual(request.body);
    });

    test("check the MessageDVO of the ResponseWrapper for the recipient after accepting", async () => {
        // const requestMessageDTO = (await services1.transport.messages.sendMessage(requestRequest)).value;
        // const requestMessageId = requestMessageDTO.id;
        // const dto = await syncUntilHasMessage(services2.transport, requestMessageId);
        // expect(dto.content["@type"]).toBe("RequestDVO");

        // const getRequestsResult = await services2.consumption.incomingRequests.getRequests({ query: { peer: services2.address } });
        // expect(getRequestsResult.value).toHaveLength(1);

        // const [request] = getRequestsResult.value;
        // await services2.consumption.incomingRequests.accept({ requestId: request.id, items: [{ accept: true }] });

        const senderResponseMessage = await exchangeAndAcceptRequestByMessage(services1, services2, { content: requestMessage.content, peer: services2.address }, responseItems);

        const dvo = (await services2.expander.expandMessageDTO(senderResponseMessage)) as RequestMessageDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toStrictEqual(senderResponseMessage.id);
        expect(dvo.name).toBe("Request title");
        expect(dvo.description).toBeUndefined();
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.date).toStrictEqual(senderResponseMessage.createdAt);
        expect(dvo.createdAt).toStrictEqual(senderResponseMessage.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(senderResponseMessage.createdByDevice);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(senderResponseMessage.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.isSelf).toBe(false);

        // const request = dto.content as RequestJSON;
        // expect(dvo.to).toHaveLength(1);
        // const to = dvo.to[0];
        // expect(to.type).toBe("RecipientDVO");
        // expect(to.id).toStrictEqual(request.to[0]);
        // expect(to.name).toBe("i18n://dvo.identity.self.name");
        // expect(to.isSelf).toBe(true);
        // expect(dvo.toCount).toStrictEqual(request.to.length);
        // expect(dvo.ccCount).toStrictEqual(request.cc!.length);
        // expect(dvo.subject).toStrictEqual(request.subject);
        // expect(dvo.body).toStrictEqual(request.body);
    });
});
