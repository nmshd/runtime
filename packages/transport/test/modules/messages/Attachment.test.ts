import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, File, Message, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("AttachmentTest", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let recipient1: AccountController;
    let recipient2: AccountController;
    let sender: AccountController;
    let file: File;
    let file2: File;
    let message1: Message;
    let message2: Message;
    let message3: Message;
    let message4: Message;
    let content: CoreBuffer;
    let content2: CoreBuffer;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 3);

        content = CoreBuffer.fromUtf8("abcd");
        content2 = CoreBuffer.fromUtf8("dcbadcba");

        recipient1 = accounts[0];
        recipient2 = accounts[1];
        sender = accounts[2];

        await TestUtil.addRelationship(sender, recipient1);
        await TestUtil.addRelationship(sender, recipient2);

        file = await TestUtil.uploadFile(sender, content);
        file2 = await TestUtil.uploadFile(sender, content2);

        message1 = await TestUtil.sendMessageWithFile(sender, recipient1, file);
        message2 = await TestUtil.sendMessageWithFile(sender, recipient2, file);
        message3 = await TestUtil.sendMessagesWithFile(sender, [recipient1, recipient2], file);
        message4 = await TestUtil.sendMessagesWithFiles(sender, [recipient1, recipient2], [file, file2]);
    });

    afterAll(async function () {
        await recipient1.close();
        await recipient2.close();
        await sender.close();
        await connection.close();
    });

    test("should send the correct message to recipient1", function () {
        expect(message1).toBeDefined();
        expect(message1.attachments).toHaveLength(1);
    });

    test("should sync in recipients until all messages received", async function () {
        const recipient1Messages = await TestUtil.syncUntilHasMessages(recipient1, 3);
        expect(recipient1Messages).toHaveLength(3);

        const recipient2Messages = await TestUtil.syncUntilHasMessages(recipient2, 3);
        expect(recipient2Messages).toHaveLength(3);
    });

    test("should get the correct message for recipient1 (single recipient)", async function () {
        const recipientMessage = await recipient1.messages.getMessage(message1.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(1);

        const downloadedContent = await recipient1.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });

    test("should get the correct message for recipient1 (multiple recipients)", async function () {
        const recipientMessage = await recipient1.messages.getMessage(message3.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(1);

        const downloadedContent = await recipient1.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });

    test("should get the correct message for recipient1 (multiple recipients, multiple files)", async function () {
        const recipientMessage = await recipient1.messages.getMessage(message4.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(2);

        const downloadedContent = await recipient1.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());

        const downloadedContent2: CoreBuffer = await recipient1.files.downloadFileContent(recipientMessage.attachments[1]);

        expect(content2.toArray()).toStrictEqual(downloadedContent2.toArray());
    });

    test("should get the correct message for recipient2 (single recipient)", async function () {
        const recipientMessage = await recipient2.messages.getMessage(message2.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(1);

        const downloadedContent = await recipient2.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });

    test("should get the correct message for recipient2 (multiple recipients)", async function () {
        const recipientMessage = await recipient2.messages.getMessage(message3.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(1);

        const downloadedContent = await recipient2.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });

    test("should get the correct message for recipient2 (multiple recipients, multiple files)", async function () {
        const recipientMessage = await recipient2.messages.getMessage(message4.id);
        expect(recipientMessage).toBeDefined();
        if (!recipientMessage) return;
        expect(recipientMessage.attachments).toHaveLength(2);

        const downloadedContent = await recipient2.files.downloadFileContent(recipientMessage.attachments[0]);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());

        const downloadedContent2: CoreBuffer = await recipient2.files.downloadFileContent(recipientMessage.attachments[1]);

        expect(content2.toArray()).toStrictEqual(downloadedContent2.toArray());
    });
});
