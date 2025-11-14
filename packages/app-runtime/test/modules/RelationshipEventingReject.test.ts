import { AppRuntime, LocalAccountSession, OnboardingChangeReceivedEvent } from "@nmshd/app-runtime";
import { RelationshipChangedEvent, RelationshipStatus } from "@nmshd/runtime";
import { EventListener, TestUtil } from "../lib/index.js";

describe("RelationshipEventingRejectTest", function () {
    let runtime: AppRuntime;

    let sessionA: LocalAccountSession;
    let sessionB: LocalAccountSession;
    let relationshipId: string;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 2);
        sessionA = await runtime.selectAccount(accounts[0].id);
        sessionB = await runtime.selectAccount(accounts[1].id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should fire events when relationship request is received", async function () {
        const templateTo = await TestUtil.createAndLoadPeerTemplate(sessionA, sessionB);
        const requestTo = await TestUtil.requestRelationshipForTemplate(sessionB, templateTo.id);
        relationshipId = requestTo.id;

        const eventListener = new EventListener(runtime, [RelationshipChangedEvent, OnboardingChangeReceivedEvent], sessionA);
        eventListener.start();
        await eventListener.waitFor(OnboardingChangeReceivedEvent, () => TestUtil.syncUntilHasRelationship(sessionA, requestTo.id));
        eventListener.stop();
        const events = eventListener.getReceivedEvents();
        expect(events).toHaveLength(2);
        const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent;
        expect(relationshipChangedEvent).toBeInstanceOf(RelationshipChangedEvent);
        expect(relationshipChangedEvent.data).toBeDefined();
        expect(relationshipChangedEvent.data.id).toBe(relationshipId);
        expect(relationshipChangedEvent.data.status).toBe(RelationshipStatus.Pending);

        const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent;
        expect(onboardingChangeReceivedEvent).toBeInstanceOf(OnboardingChangeReceivedEvent);
        expect(onboardingChangeReceivedEvent.data).toBeDefined();
        expect(onboardingChangeReceivedEvent.data.auditLogEntry.newStatus).toBe(RelationshipStatus.Pending);
        expect(onboardingChangeReceivedEvent.data.identity).toBeDefined();
        expect(onboardingChangeReceivedEvent.data.identity.name).toBe("i18n://dvo.identity.unknown");
        expect(onboardingChangeReceivedEvent.data.identity.id).toBe(sessionB.accountController.identity.address.toString());

        expect(onboardingChangeReceivedEvent.data.relationship).toBe(relationshipChangedEvent.data);
    });

    test("should fire events on the templator when relationship request was rejected (by templator itself)", async function () {
        const eventListenerFrom = new EventListener(runtime, [RelationshipChangedEvent], sessionA);
        eventListenerFrom.start();
        await TestUtil.rejectRelationship(sessionA, relationshipId);
        eventListenerFrom.stop();

        const eventsFrom = eventListenerFrom.getReceivedEvents();
        expect(eventsFrom).toHaveLength(1);

        const relationshipChangedEvent = eventsFrom[0].instance as RelationshipChangedEvent;
        expect(relationshipChangedEvent).toBeInstanceOf(RelationshipChangedEvent);
        expect(relationshipChangedEvent.data).toBeDefined();
        expect(relationshipChangedEvent.data.id).toBe(relationshipId);
        expect(relationshipChangedEvent.data.status).toBe(RelationshipStatus.Rejected);
    });

    test("should fire events on the requestor when relationship request was rejected", async function () {
        const eventListenerTo = new EventListener(runtime, [RelationshipChangedEvent, OnboardingChangeReceivedEvent], sessionB);
        eventListenerTo.start();
        await eventListenerTo.waitFor(OnboardingChangeReceivedEvent, () => TestUtil.syncUntilHasRelationship(sessionB, relationshipId));
        eventListenerTo.stop();

        const events = eventListenerTo.getReceivedEvents();
        expect(events).toHaveLength(2);
        const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent;
        expect(relationshipChangedEvent).toBeInstanceOf(RelationshipChangedEvent);
        expect(relationshipChangedEvent.data).toBeDefined();
        expect(relationshipChangedEvent.data.id).toBe(relationshipId);
        expect(relationshipChangedEvent.data.status).toBe(RelationshipStatus.Rejected);

        const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent;
        expect(onboardingChangeReceivedEvent).toBeInstanceOf(OnboardingChangeReceivedEvent);
        expect(onboardingChangeReceivedEvent.data).toBeDefined();
        expect(onboardingChangeReceivedEvent.data.auditLogEntry.newStatus).toBe(RelationshipStatus.Rejected);
        expect(onboardingChangeReceivedEvent.data.identity).toBeDefined();

        expect(onboardingChangeReceivedEvent.data.identity.name).toBe("i18n://dvo.identity.unknown");
        expect(onboardingChangeReceivedEvent.data.identity.id).toBe(sessionA.accountController.identity.address.toString());
        expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).toBe(true);
        expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).toBe(relationshipChangedEvent.data.id);

        expect(onboardingChangeReceivedEvent.data.relationship).toBe(relationshipChangedEvent.data);
    });
});
