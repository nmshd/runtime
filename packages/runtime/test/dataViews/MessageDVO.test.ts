import { GivenName, IdentityAttribute, MailJSON, ReadAttributeAcceptResponseItem, ReadAttributeRequestItem, ResponseItemResult, ResponseResult } from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/transport";
import { DataViewExpander, MailDVO, TransportServices } from "../../src";
import { establishRelationshipWithContents, getRelationship, RuntimeServiceProvider, syncUntilHasMessages, uploadFile } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;
let expander1: DataViewExpander;
let expander2: DataViewExpander;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    transportServices2 = runtimeServices[1].transport;
    expander1 = runtimeServices[0].expander;
    expander2 = runtimeServices[1].expander;
    await establishRelationshipWithContents(
        transportServices1,
        transportServices2,
        {
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
        },
        {
            response: {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: await CoreId.generate(),
                items: [
                    ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: await CoreId.generate(),
                        attribute: IdentityAttribute.from({
                            owner: CoreAddress.from((await transportServices1.account.getIdentityInfo()).value.address),
                            value: GivenName.from("AGivenName")
                        })
                    })
                ]
            }
        }
    );
}, 30000);

afterAll(() => serviceProvider.stop());

describe("MessageDVO", () => {
    let transportService2Address: string;
    let fileId: string;
    let messageId: string;
    let mailId: string;
    // let changeAttributeMailId: string;

    beforeAll(async () => {
        const file = await uploadFile(transportServices1);
        fileId = file.id;

        const relationship = await getRelationship(transportServices1);
        transportService2Address = relationship.peer;

        const result = await transportServices1.messages.sendMessage({
            recipients: [transportService2Address],
            content: {
                arbitraryValue: true
            },
            attachments: [fileId]
        });
        messageId = result.value.id;
        const mailResult = await transportServices1.messages.sendMessage({
            recipients: [transportService2Address],
            content: {
                "@type": "Mail",
                body: "This is a Mail.",
                cc: [],
                subject: "Mail Subject",
                to: [transportService2Address]
            },
            attachments: [fileId]
        });
        mailId = mailResult.value.id;

        const messages = await syncUntilHasMessages(transportServices2, 2);
        if (messages.length < 2) {
            throw new Error("Not enough messages synced");
        }
    });

    test("check the message dvo for the sender", async () => {
        const dto = (await transportServices1.messages.getMessage({ id: messageId })).value;
        const dvo = await expander1.expandMessageDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.id).toStrictEqual(messageId);
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
        expect(recipient.name).toBe(recipient.id.substring(3, 9)); // "Barbara"
        expect(recipient.isSelf).toBe(false);
        expect(dvo.status).toBe("Delivering");
    });

    test("check the message dvo for the recipient", async () => {
        const dto = (await transportServices2.messages.getMessage({ id: messageId })).value;
        const dvo = await expander2.expandMessageDTO(dto);
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
        expect(dvo.createdBy.name).toBe(dvo.createdBy.id.substring(3, 9)); // "Jürgen"
        expect(dvo.createdBy.isSelf).toBe(false);
        const recipient = dvo.recipients[0];
        expect(recipient.type).toBe("RecipientDVO");
        expect(recipient.id).toStrictEqual(dto.recipients[0].address);
        expect(recipient.name).toBe("i18n://dvo.identity.self.name");
        expect(recipient.isSelf).toBe(true);
        expect(dvo.status).toBe("Received");
    });

    test("check the mail dvo for the sender", async () => {
        const dto = (await transportServices1.messages.getMessage({ id: mailId })).value;
        const dvo = (await expander1.expandMessageDTO(dto)) as MailDVO;
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
        expect(recipient.name).toBe(recipient.id.substring(3, 9)); // "Barbara"
        expect(recipient.isSelf).toBe(false);

        expect(dvo.to).toHaveLength(1);
        const to = dvo.to[0];
        expect(to.type).toBe("RecipientDVO");
        expect(to.id).toStrictEqual(mail.to[0]);
        expect(to.name).toBe(to.id.substring(3, 9)); // "Barbara"
        expect(to.isSelf).toBe(false);
        expect(dvo.toCount).toStrictEqual(mail.to.length);
        expect(dvo.ccCount).toStrictEqual(mail.cc!.length);
        expect(dvo.subject).toStrictEqual(mail.subject);
        expect(dvo.body).toStrictEqual(mail.body);
    });

    test("check the mail dvo for the recipient", async () => {
        const dto = (await transportServices2.messages.getMessage({ id: mailId })).value;
        const dvo = (await expander2.expandMessageDTO(dto)) as MailDVO;
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
        expect(dvo.createdBy.name).toBe(dvo.createdBy.id.substring(3, 9)); // "Jürgen"
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
