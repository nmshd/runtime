import { DecideRequestItemParametersJSON } from "@nmshd/consumption";
import { ArbitraryMessageContent, ConsentRequestItemJSON, MailJSON } from "@nmshd/content";
import { CreateOutgoingRequestRequest, MailDVO, RequestMessageDVO, SendMessageRequest } from "../../src";
import {
    establishRelationship,
    exchangeMessageWithRequest,
    getRelationship,
    RuntimeServiceProvider,
    sendMessageWithRequest,
    syncUntilHasMessage,
    syncUntilHasMessageWithRequest,
    syncUntilHasMessageWithResponse,
    TestRuntimeServices,
    uploadFile
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];

    await establishRelationship(services1.transport, services2.transport);
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
                body: "aBody",
                cc: [],
                subject: "aSubject",
                to: [transportService2Address],
                bodyFormat: "PlainText"
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
        expect(dvo.name).toBe("aSubject");
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
        expect(dvo.name).toBe("aSubject");
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

describe("Message with Request", () => {
    let requestContent: CreateOutgoingRequestRequest;
    let responseItems: DecideRequestItemParametersJSON[];

    beforeAll(() => {
        requestContent = {
            content: {
                items: [
                    {
                        "@type": "ConsentRequestItem",
                        consent: "Consent text",
                        mustBeAccepted: true
                    } as ConsentRequestItemJSON
                ]
            },
            peer: services2.address
        };

        responseItems = [{ accept: true }];
    });

    test("check the MessageDVO of the Request for the sender", async () => {
        const senderMessage = await sendMessageWithRequest(services1, services2, requestContent);
        await syncUntilHasMessageWithRequest(services2.transport, senderMessage.content.id!);
        const dto = senderMessage;
        const dvo = (await services1.expander.expandMessageDTO(senderMessage)) as RequestMessageDVO;

        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
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

        expect(dvo.request).toBeDefined();
        expect(dvo.request.source!.type).toBe("Message");
        expect(dvo.request.source!.reference).toBe(dto.id);
        expect(dvo.request.isOwn).toBe(true);
        expect(dvo.request.createdBy.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.request.peer.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.status).toBe("Open");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Open");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        expect(dvo.request.decider.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.response).toBeUndefined();
    });

    test("check the MessageDVO of the Request for the recipient before deciding", async () => {
        const recipientMessage = await exchangeMessageWithRequest(services1, services2, requestContent);
        const dto = recipientMessage;
        const dvo = (await services2.expander.expandMessageDTO(recipientMessage)) as RequestMessageDVO;

        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.createdBy.isSelf).toBe(false);

        expect(dvo.recipients).toHaveLength(1);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.isSelf).toBe(true);

        expect(dvo.request).toBeDefined();
        expect(dvo.request.source!.type).toBe("Message");
        expect(dvo.request.isOwn).toBe(false);
        expect(dvo.request.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.peer.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.status).toBe("DecisionRequired");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.DecisionRequired");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(true);
        expect(dvo.request.decider.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.request.response).toBeUndefined();
    });

    test("check the MessageDVO of the ResponseWrapper for the recipient after accepting", async () => {
        const senderRequestMessage = await exchangeMessageWithRequest(services1, services2, requestContent);
        await services2.consumption.incomingRequests.accept({ requestId: senderRequestMessage.content.id!, items: responseItems });
        const senderResponseMessage = await syncUntilHasMessageWithResponse(services1.transport, senderRequestMessage.content.id!);
        const recipientResponseMessage = (await services2.transport.messages.getMessage({ id: senderResponseMessage.id })).value;
        const dto = recipientResponseMessage;
        const dvo = (await services2.expander.expandMessageDTO(recipientResponseMessage)) as RequestMessageDVO;

        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
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

        expect(dvo.request).toBeDefined();
        expect(dvo.request.source!.type).toBe("Message");
        expect(dvo.request.isOwn).toBe(false);
        expect(dvo.request.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.peer.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.status).toBe("Completed");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Completed");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        expect(dvo.request.decider.name).toBe("i18n://dvo.identity.self.name");

        expect(dvo.request.response!.content.items).toHaveLength(1);
        expect(dvo.request.response!.content.result).toBe("Accepted");
        expect(dvo.request.response!.source?.type).toBe("Message");
        expect(dvo.request.response!.source?.reference).toBe(dvo.id);
    });

    test("check the MessageDVO of the ResponseWrapper for the sender after accepting", async () => {
        const senderRequestMessage = await exchangeMessageWithRequest(services1, services2, requestContent);
        await services2.consumption.incomingRequests.accept({ requestId: senderRequestMessage.content.id!, items: responseItems });
        const senderResponseMessage = await syncUntilHasMessageWithResponse(services1.transport, senderRequestMessage.content.id!);
        const dto = senderResponseMessage;
        const dvo = (await services1.expander.expandMessageDTO(senderResponseMessage)) as RequestMessageDVO;

        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RequestMessageDVO");
        expect(dvo.name).toBe("i18n://dvo.message.name");
        expect(dvo.description).toBeUndefined();
        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.createdAt).toStrictEqual(dto.createdAt);
        expect(dvo.createdByDevice).toStrictEqual(dto.createdByDevice);
        expect(dvo.id).toStrictEqual(dto.id);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.createdBy.type).toBe("IdentityDVO");
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.createdBy.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.createdBy.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.createdBy.isSelf).toBe(false);

        expect(dvo.recipients).toHaveLength(1);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.isSelf).toBe(true);

        expect(dvo.request).toBeDefined();
        expect(dvo.request.source!.type).toBe("Message");
        expect(dvo.request.isOwn).toBe(true);
        expect(dvo.request.createdBy.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.request.peer.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.request.status).toBe("Completed");
        expect(dvo.request.statusText).toBe("i18n://dvo.localRequest.status.Completed");
        expect(dvo.request.type).toBe("LocalRequestDVO");
        expect(dvo.request.content.type).toBe("RequestDVO");
        expect(dvo.request.content.items).toHaveLength(1);
        expect(dvo.request.isDecidable).toBe(false);
        expect(dvo.request.decider.name).toBe("i18n://dvo.identity.unknown");

        expect(dvo.request.response!.content.items).toHaveLength(1);
        expect(dvo.request.response!.content.result).toBe("Accepted");
        expect(dvo.request.response!.source?.type).toBe("Message");
        expect(dvo.request.response!.source?.reference).toBe(dvo.id);
    });
});
