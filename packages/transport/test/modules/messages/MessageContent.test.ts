import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ISerializable, JSONWrapper, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { AccountController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageContent", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let recipient1: AccountController;
    let recipient2: AccountController;
    let sender: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 3);

        recipient1 = accounts[0];
        recipient2 = accounts[1];
        sender = accounts[2];

        await TestUtil.addRelationship(sender, recipient1);
        await TestUtil.addRelationship(sender, recipient2);
    });

    afterAll(async function () {
        await recipient1.close();
        await recipient2.close();
        await sender.close();
        await connection.close();
    });

    describe("Any Content", function () {
        test("should send the message", async function () {
            const value: any = Serializable.fromAny({ any: "content", submitted: true });
            expect(value).toBeInstanceOf(JSONWrapper);
            await TestUtil.sendMessage(sender, recipient1, value);
        });

        test("should correctly store the message (sender)", async function () {
            const messages = await sender.messages.getMessagesByAddress(recipient1.identity.address);
            expect(messages).toHaveLength(1);
            const message = messages[0];
            const content = message.cache!.content as any;
            expect(content).toBeInstanceOf(JSONWrapper);
            expect(content.value.any).toBe("content");
            expect(content.value.submitted).toBe(true);
        });

        test("should correctly serialize the message (sender)", async function () {
            const messages = await sender.messages.getMessagesByAddress(recipient1.identity.address);
            expect(messages).toHaveLength(1);
            const message = messages[0];
            const object = message.toJSON() as any;
            expect(object.cache.content).toBeDefined();
            expect(object.cache.content.any).toBe("content");
            expect(object.cache.content.submitted).toBe(true);
        });

        test("should correctly store the message (recipient)", async function () {
            const messagesSync = await TestUtil.syncUntilHasMessages(recipient1);
            expect(messagesSync).toHaveLength(1);
            const messages = await recipient1.messages.getMessagesByAddress(sender.identity.address);
            expect(messages).toHaveLength(1);
            const message = messages[0];
            const content = message.cache!.content as any;
            expect(content).toBeInstanceOf(JSONWrapper);
            expect(content.value.any).toBe("content");
            expect(content.value.submitted).toBe(true);
        });

        test("should correctly serialize the message (recipient)", async function () {
            const messages = await recipient1.messages.getMessagesByAddress(sender.identity.address);
            expect(messages).toHaveLength(1);
            const message = messages[0];
            const object = message.toJSON() as any;
            expect(object.cache.content).toBeDefined();
            expect(object.cache.content.any).toBe("content");
            expect(object.cache.content.submitted).toBe(true);
        });
    });

    describe("Mail", function () {
        test("should send the message", async function () {
            const value = Mail.from({
                body: "aBody",
                subject: "aSubject",
                to: [recipient1.identity.address]
            });
            const message = await TestUtil.sendMessage(sender, recipient1, value);

            expect(message).toBeDefined();
        });

        test("should correctly store the message (sender)", async function () {
            const messages = await sender.messages.getMessagesByAddress(recipient1.identity.address);
            expect(messages).toHaveLength(2);
            const message = messages[1];
            expect(message.cache!.content).toBeInstanceOf(Mail);
            const content = message.cache!.content as Mail;
            expect(content.body).toBe("Test");
            expect(content.subject).toBe("Test Subject");
            expect(content.to).toBeInstanceOf(Array);
            expect(content.to[0]).toBeInstanceOf(CoreAddress);
            expect(content.to[0].toString()).toBe(recipient1.identity.address.toString());
        });

        test("should correctly store the message (recipient)", async function () {
            const messagesSync = await TestUtil.syncUntilHasMessages(recipient1);
            expect(messagesSync).toHaveLength(1);
            const messages = await recipient1.messages.getMessagesByAddress(sender.identity.address);
            expect(messages).toHaveLength(2);
            const message = messages[1];
            const content = message.cache!.content as Mail;
            expect(content.body).toBe("Test");
            expect(content.subject).toBe("Test Subject");
            expect(content.to).toBeInstanceOf(Array);
            expect(content.to[0]).toBeInstanceOf(CoreAddress);
            expect(content.to[0].toString()).toBe(recipient1.identity.address.toString());
        });
    });
});

interface IMail extends ISerializable {
    to: ICoreAddress[];
    cc?: ICoreAddress[];
    subject: string;
    body: string;
}

@type("Mail")
class Mail extends Serializable implements IMail {
    @serialize({ type: CoreAddress })
    @validate()
    public to: CoreAddress[];

    @serialize({ type: CoreAddress })
    @validate({ nullable: true })
    public cc: CoreAddress[] = [];

    @serialize()
    @validate()
    public subject: string;

    @serialize()
    @validate()
    public body: string;

    protected static override preFrom(value: any): any {
        if (!value.cc) value.cc = [];

        if (!value.body && value.content) {
            value.body = value.content;
            delete value.content;
        }

        return value;
    }

    public static from(value: IMail): Mail {
        return this.fromAny(value);
    }
}
