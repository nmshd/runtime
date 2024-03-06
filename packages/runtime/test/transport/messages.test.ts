import { ConsentRequestItemJSON } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/transport";
import { GetMessagesQuery, MessageReceivedEvent, MessageSentEvent, MessageWasReadAtChangedEvent } from "../../src";
import {
    ensureActiveRelationship,
    establishRelationship,
    exchangeMessage,
    exchangeMessageWithAttachment,
    QueryParamConditions,
    RuntimeServiceProvider,
    sendMessage,
    syncUntilHasMessage,
    syncUntilHasMessages,
    TestRuntimeServices,
    uploadFile
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let client1: TestRuntimeServices;
let client2: TestRuntimeServices;
let client3: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(3);
    client1 = runtimeServices[0];
    client2 = runtimeServices[1];
    client3 = runtimeServices[2];
    await ensureActiveRelationship(client1.transport, client2.transport);
    await ensureActiveRelationship(client1.transport, client3.transport);
}, 30000);

beforeEach(() => {
    client1.eventBus.reset();
});

afterAll(() => serviceProvider.stop());

describe("Messaging", () => {
    let fileId: string;

    beforeAll(async () => {
        const file = await uploadFile(client1.transport);
        fileId = file.id;
    });

    test("send a Message from client1.transport to client2.transport", async () => {
        expect(fileId).toBeDefined();

        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [],
                subject: "a",
                to: [client2.address]
            },
            attachments: [fileId]
        });
        expect(result).toBeSuccessful();
        await expect(client1.eventBus).toHavePublished(MessageSentEvent, (m) => m.data.id === result.value.id);
    });

    test("receive the message in a sync run", async () => {
        const messageId = (await sendMessage(client1.transport, client2.address, undefined, [fileId])).id;

        const message = await syncUntilHasMessage(client2.transport, messageId);
        await expect(client2.eventBus).toHavePublished(MessageReceivedEvent, (m) => m.data.id === messageId);

        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            subject: "This is the mail subject",
            body: "This is the mail body",
            cc: [],
            to: [client2.address]
        });
    });

    test("receive the message on TransportService2 in /Messages", async () => {
        const baselineNumberOfMessages = (await client2.transport.messages.getMessages({})).value.length;
        const messageId = (await exchangeMessage(client1.transport, client2.transport, [fileId])).id;

        const response = await client2.transport.messages.getMessages({});
        expect(response).toBeSuccessful();
        const numberOfMessages = response.value.length;
        expect(numberOfMessages - baselineNumberOfMessages).toBe(1);

        const message = response.value[numberOfMessages - 1];
        expect(message.id).toStrictEqual(messageId);
        expect(message.content).toStrictEqual({
            "@type": "Mail",
            subject: "This is the mail subject",
            body: "This is the mail body",
            cc: [],
            to: [client2.address]
        });
    });

    test("receive the message on TransportService2 in /Messages/{id}", async () => {
        const messageId = (await exchangeMessage(client1.transport, client2.transport, [fileId])).id;

        const response = await client2.transport.messages.getMessage({ id: messageId });
        expect(response).toBeSuccessful();
    });

    test("send a Message to multiple recipients", async () => {
        expect(fileId).toBeDefined();

        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address, client3.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [client3.address],
                subject: "a",
                to: [client2.address]
            },
            attachments: [fileId]
        });
        expect(result).toBeSuccessful();
        await expect(client1.eventBus).toHavePublished(MessageSentEvent, (m) => m.data.id === result.value.id);
        messageId = result.value.id;
    });
});

describe("Message errors", () => {
    let requestItem: ConsentRequestItemJSON;
    let requestId: string;
    beforeAll(async () => {
        requestItem = {
            "@type": "ConsentRequestItem",
            consent: "I consent to this RequestItem",
            mustBeAccepted: true
        };
        const createRequestResult = await client1.consumption.outgoingRequests.create({
            content: {
                items: [requestItem]
            },
            peer: client2.address
        });
        requestId = createRequestResult.value.id;
    });
    test("should throw correct error for empty 'to' in the Message", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
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
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                subject: "A Subject",
                body: "A Body"
            }
        });
        expect(result).toBeAnError("Mail.to :: Value is not defined", "error.runtime.requestDeserialization");
    });

    test("should throw correct error for missing Request ID in a Message with Request content", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("The Request must have an id.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error for missing LocalRequest trying to send a Message with Request content", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                id: CoreId.from("REQxxxxxxxxxxxxxxxxx"),
                items: [requestItem]
            }
        });
        expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw correct error for trying to send a Message with Request content to multiple recipients", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address, client3.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("Only one recipient is allowed for sending Requests.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error for trying to send a Message with a Request content that doesn't match the content of the LocalRequest", async () => {
        const wrongRequestItem = {
            "@type": "AuthenticationRequestItem",
            mustBeAccepted: true
        };
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [wrongRequestItem]
            }
        });
        expect(result).toBeAnError("The sent Request must have the same content as the LocalRequest.", "error.runtime.validation.invalidPropertyValue");
    });

    test("should throw correct error if Message's recipient doesn't match Request's peer", async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client3.address],
            content: {
                "@type": "Request",
                id: requestId,
                items: [requestItem]
            }
        });
        expect(result).toBeAnError("The recipient does not match the Request's peer.", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Mark Message as un-/read", () => {
    let messageId: string;
    beforeEach(async () => {
        const result = await client1.transport.messages.sendMessage({
            recipients: [client2.address],
            content: {
                "@type": "Mail",
                body: "A body",
                cc: [],
                subject: "A subject",
                to: [client2.address]
            }
        });
        await syncUntilHasMessages(client2.transport, 1);
        messageId = result.value.id;
    });

    test("Mark Message as read", async () => {
        const messageResult = await client2.transport.messages.getMessage({ id: messageId });
        expect(messageResult).toBeSuccessful();
        const message = messageResult.value;
        expect(message.wasReadAt).toBeUndefined();

        const expectedReadTime = CoreDate.utc();
        const updatedMessageResult = await client2.transport.messages.markMessageAsRead({ id: messageId });

        const updatedMessage = updatedMessageResult.value;
        expect(updatedMessage.wasReadAt).toBeDefined();
        const actualReadTime = CoreDate.from(updatedMessage.wasReadAt!);
        expect(actualReadTime.isSameOrAfter(expectedReadTime)).toBe(true);

        await expect(client2.eventBus).toHavePublished(MessageWasReadAtChangedEvent, (m) => m.data.id === messageId);
    });

    test("Mark Message as unread", async () => {
        const messageResult = await client2.transport.messages.getMessage({ id: messageId });
        expect(messageResult).toBeSuccessful();
        const message = messageResult.value;
        expect(message.wasReadAt).toBeUndefined();

        await client2.transport.messages.markMessageAsRead({ id: messageId });
        // reset event bus to not have the event from the previous call
        client2.eventBus.reset();

        const updatedMessageResult = await client2.transport.messages.markMessageAsUnread({ id: messageId });

        const updatedMessage = updatedMessageResult.value;
        expect(updatedMessage.wasReadAt).toBeUndefined();

        await expect(client2.eventBus).toHavePublished(MessageWasReadAtChangedEvent, (m) => m.data.id === messageId);
    });
});

describe("Message query", () => {
    test("query messages", async () => {
        const message = await exchangeMessageWithAttachment(client1.transport, client2.transport);
        const updatedMessage = (await client2.transport.messages.markMessageAsRead({ id: message.id })).value;
        const conditions = new QueryParamConditions<GetMessagesQuery>(updatedMessage, client2.transport)
            .addDateSet("createdAt")
            .addStringSet("createdBy")
            .addDateSet("wasReadAt")
            .addStringSet("recipients.address", updatedMessage.recipients[0].address)
            .addStringSet("content.@type")
            .addStringSet("content.subject")
            .addStringSet("content.body")
            .addStringSet("createdByDevice")
            .addStringArraySet("attachments")
            .addStringSet("recipients.relationshipId")
            .addSingleCondition({
                key: "participant",
                value: [updatedMessage.createdBy, "id111111111111111111111111111111111"],
                expectedResult: true
            });

        await conditions.executeTests((c, q) => c.messages.getMessages({ query: q }));
    });

    test("query messages by relationship ids", async () => {
        const additionalRuntimeServices = await serviceProvider.launch(2);
        const recipient1 = additionalRuntimeServices[0].transport;
        const recipient2 = additionalRuntimeServices[1].transport;

        await establishRelationship(client1.transport, recipient1);
        await establishRelationship(client1.transport, recipient2);

        const addressRecipient1 = (await recipient1.account.getIdentityInfo()).value.address;
        const addressRecipient2 = (await recipient2.account.getIdentityInfo()).value.address;

        const relationshipToRecipient1 = await client1.transport.relationships.getRelationshipByAddress({ address: addressRecipient1 });
        const relationshipToRecipient2 = await client1.transport.relationships.getRelationshipByAddress({ address: addressRecipient2 });

        await client1.transport.messages.sendMessage({
            content: {},
            recipients: [addressRecipient1]
        });
        await client1.transport.messages.sendMessage({
            content: {},
            recipients: [addressRecipient2]
        });

        const messagesToRecipient1 = await client1.transport.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient1.value.id } });
        const messagesToRecipient2 = await client1.transport.messages.getMessages({ query: { "recipients.relationshipId": relationshipToRecipient2.value.id } });
        const messagesToRecipient1Or2 = await client1.transport.messages.getMessages({
            query: { "recipients.relationshipId": [relationshipToRecipient1.value.id, relationshipToRecipient2.value.id] }
        });

        expect(messagesToRecipient1.value).toHaveLength(1);
        expect(messagesToRecipient2.value).toHaveLength(1);
        expect(messagesToRecipient1Or2.value).toHaveLength(2);
    });

    test("query Messages withAttachments", async () => {
        const messageWithAttachment = await exchangeMessageWithAttachment(client1.transport, client2.transport);
        const messageWithoutAttachment = await exchangeMessage(client1.transport, client2.transport);

        const messages = await client2.transport.messages.getMessages({ query: { attachments: "+" } });

        expect(messages.value.every((m) => m.attachments.length > 0)).toBe(true);

        const messageIds = messages.value.map((m) => m.id);
        expect(messageIds).toContain(messageWithAttachment.id);
        expect(messageIds).not.toContain(messageWithoutAttachment.id);
    });
});
