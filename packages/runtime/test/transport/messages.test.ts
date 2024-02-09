import { GetMessagesQuery, MessageSentEvent, TransportServices } from "../../src";
import {
    establishRelationship,
    exchangeMessage,
    exchangeMessageWithAttachment,
    getRelationship,
    MockEventBus,
    QueryParamConditions,
    RuntimeServiceProvider,
    syncUntilHasMessages,
    uploadFile
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let eventBus1: MockEventBus;
let transportServices2: TransportServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    eventBus1 = runtimeServices[0].eventBus;
    transportServices2 = runtimeServices[1].transport;
    await establishRelationship(transportServices1, transportServices2);
}, 30000);

beforeEach(() => {
    eventBus1.reset();
});

afterAll(() => serviceProvider.stop());

describe("Messaging", () => {
    let transportService2Address: string;
    let fileId: string;
    let messageId: string;

    beforeAll(async () => {
        const file = await uploadFile(transportServices1);
        fileId = file.id;

        const relationship = await getRelationship(transportServices1);
        transportService2Address = relationship.peer;
    });

    test("send a Message from TransportServices1 to TransportServices2", async () => {
        expect(transportService2Address).toBeDefined();
        expect(fileId).toBeDefined();

        const result = await transportServices1.messages.sendMessage({
            recipients: [transportService2Address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [],
                subject: "a",
                to: [transportService2Address]
            },
            attachments: [fileId]
        });
        expect(result).toBeSuccessful();
        await expect(eventBus1).toHavePublished(MessageSentEvent, (m) => m.data.id === result.value.id);

        messageId = result.value.id;
    });

    test("receive the message in a sync run", async () => {
        expect(messageId).toBeDefined();

        const messages = await syncUntilHasMessages(transportServices2);
        expect(messages).toHaveLength(1);

        const message = messages[0];
        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            body: "b",
            cc: [],
            subject: "a",
            to: [transportService2Address]
        });
    });

    test("receive the message on TransportService2 in /Messages", async () => {
        expect(messageId).toBeDefined();

        const response = await transportServices2.messages.getMessages({});
        expect(response).toBeSuccessful();
        expect(response.value).toHaveLength(1);

        const message = response.value[0];
        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            body: "b",
            cc: [],
            subject: "a",
            to: [transportService2Address]
        });
    });

    test("receive the message on TransportService2 in /Messages/{id}", async () => {
        expect(messageId).toBeDefined();

        const response = await transportServices2.messages.getMessage({ id: messageId });
        expect(response).toBeSuccessful();
    });
});

describe("Message errors", () => {
    const fakeAddress = "id1PNvUP4jHD74qo6usnWNoaFGFf33MXZi6c";
    test("should throw correct error for empty 'to' in the Message", async () => {
        const result = await transportServices1.messages.sendMessage({
            recipients: [fakeAddress],
            content: {
                "@type": "Mail",
                to: [],
                subject: "A Subject",
                body: "A Body"
            }
        });
        expect(result).toBeAnError("Mail.to:Array :: may not be empty", "error.runtime.requestDeserialization");
    });

    test("should throw correct error for missing 'to' in the Message", async () => {
        const result = await transportServices1.messages.sendMessage({
            recipients: [fakeAddress],
            content: {
                "@type": "Mail",
                subject: "A Subject",
                body: "A Body"
            }
        });
        expect(result).toBeAnError("Mail.to :: Value is not defined", "error.runtime.requestDeserialization");
    });
});

describe("Message query", () => {
    test("query messages", async () => {
        const message = await exchangeMessageWithAttachment(transportServices1, transportServices2);
        const conditions = new QueryParamConditions<GetMessagesQuery>(message, transportServices2)
            .addDateSet("createdAt")
            .addStringSet("createdBy")
            .addStringSet("recipients.address", message.recipients[0].address)
            .addStringSet("content.@type")
            .addStringSet("content.subject")
            .addStringSet("content.body")
            .addStringSet("createdByDevice")
            .addStringArraySet("attachments")
            .addStringSet("recipients.relationshipId")
            .addSingleCondition({
                key: "participant",
                value: [message.createdBy, "id111111111111111111111111111111111"],
                expectedResult: true
            });

        await conditions.executeTests((c, q) => c.messages.getMessages({ query: q }));
    });

    test("query messages by relationship ids", async () => {
        const additionalRuntimeServices = await serviceProvider.launch(2);
        const recipient1 = additionalRuntimeServices[0].transport;
        const recipient2 = additionalRuntimeServices[1].transport;

        await establishRelationship(transportServices1, recipient1);
        await establishRelationship(transportServices1, recipient2);

        const addressRecipient1 = (await recipient1.account.getIdentityInfo()).value.address;
        const addressRecipient2 = (await recipient2.account.getIdentityInfo()).value.address;

        const relationshipToRecipient1 = await transportServices1.relationships.getRelationshipByAddress({ address: addressRecipient1 });
        const relationshipToRecipient2 = await transportServices1.relationships.getRelationshipByAddress({ address: addressRecipient2 });

        await transportServices1.messages.sendMessage({
            content: {},
            recipients: [addressRecipient1]
        });
        await transportServices1.messages.sendMessage({
            content: {},
            recipients: [addressRecipient2]
        });

        const messagesToRecipient1 = await transportServices1.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient1.value.id } });
        const messagesToRecipient2 = await transportServices1.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient2.value.id } });
        const messagesToRecipient1Or2 = await transportServices1.messages.getMessages({
            query: { "recipients.relationshipId": [relationshipToRecipient1.value.id, relationshipToRecipient2.value.id] }
        });

        expect(messagesToRecipient1.value).toHaveLength(1);
        expect(messagesToRecipient2.value).toHaveLength(1);
        expect(messagesToRecipient1Or2.value).toHaveLength(2);
    });

    test("query Messages withAttachments", async () => {
        const messageWithAttachment = await exchangeMessageWithAttachment(transportServices1, transportServices2);
        const messageWithoutAttachment = await exchangeMessage(transportServices1, transportServices2);

        const messages = await transportServices2.messages.getMessages({ query: { attachments: "+" } });

        expect(messages.value.every((m) => m.attachments.length > 0)).toBe(true);

        const messageIds = messages.value.map((m) => m.id);
        expect(messageIds).toContain(messageWithAttachment.id);
        expect(messageIds).not.toContain(messageWithoutAttachment.id);
    });
});
