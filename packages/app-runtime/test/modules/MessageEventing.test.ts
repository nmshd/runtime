import { MailJSON } from "@nmshd/content";
import { MessageReceivedEvent } from "@nmshd/runtime";
import { AppRuntime, LocalAccountSession, MailReceivedEvent } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("MessageEventingTest", function () {
    let runtime: AppRuntime;

    let sessionA: LocalAccountSession;
    let sessionB: LocalAccountSession;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 2);
        sessionA = await runtime.selectAccount(accounts[0].id);
        sessionB = await runtime.selectAccount(accounts[1].id);

        await TestUtil.addRelationship(sessionA, sessionB);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should fire events when mail is received", async function () {
        const createdBy = (await sessionA.transportServices.account.getIdentityInfo()).value.address;
        const recipient = (await sessionB.transportServices.account.getIdentityInfo()).value.address;
        const mail: MailJSON = {
            "@type": "Mail",
            to: [recipient],
            subject: "aSubject",
            body: "aBody"
        };
        const message = await TestUtil.sendMessage(sessionA, sessionB, mail);
        const eventListener = new EventListener(runtime, [MailReceivedEvent, MessageReceivedEvent]);
        eventListener.start();
        await eventListener.waitFor(MailReceivedEvent, () => TestUtil.syncUntilHasMessage(sessionB, message.id));
        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);
        const messageReceivedEvent = events[0].instance as MessageReceivedEvent;
        expect(messageReceivedEvent).toBeInstanceOf(MessageReceivedEvent);
        expect(messageReceivedEvent.data).toBeDefined();
        expect(messageReceivedEvent.data.id).toBe(message.id);
        expect(messageReceivedEvent.data.createdBy).toBe(createdBy);

        const mailReceivedEvent = events[1].instance as MailReceivedEvent;
        expect(mailReceivedEvent).toBeInstanceOf(MailReceivedEvent);
        expect(mailReceivedEvent.data).toBeDefined();
        expect(mailReceivedEvent.data.body).toBe(mail.body);
        expect(mailReceivedEvent.data.name).toBe(mail.subject);
        expect(mailReceivedEvent.data.id).toBe(message.id);
        expect(mailReceivedEvent.data.date).toBe(message.createdAt);
        expect(mailReceivedEvent.data.type).toBe("MailDVO");
        expect(mailReceivedEvent.data.createdBy.type).toBe("IdentityDVO");
        expect(mailReceivedEvent.data.createdBy.name).toBe("i18n://dvo.identity.unknown");
    });
});
