import { RelationshipChangedEvent, RelationshipChangeStatus, RelationshipStatus } from "@nmshd/runtime";
import { AppRuntime, LocalAccountSession, OnboardingChangeReceivedEvent } from "../../src";
import { EventListener, TestUtil } from "../lib";

describe("RelationshipEventingRevokeTest", function () {
    let runtime: AppRuntime;

    let sessionA: LocalAccountSession;
    let sessionB: LocalAccountSession;
    let relationshipId: string;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        const accounts = await TestUtil.provideAccounts(runtime, 2);
        sessionA = await runtime.selectAccount(accounts[0].id);
        await runtime.selectAccount(accounts[1].id);
        sessionB = await runtime.getOrCreateSession(accounts[1].id);
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
        expect(onboardingChangeReceivedEvent.data.change.status).toBe(RelationshipChangeStatus.Pending);
        expect(onboardingChangeReceivedEvent.data.change).toBe(relationshipChangedEvent.data.changes[0]);
        expect(onboardingChangeReceivedEvent.data.identity).toBeDefined();

        expect(onboardingChangeReceivedEvent.data.identity.name).toBe(sessionB.accountController.identity.address.toString().substring(3, 9));
        expect(onboardingChangeReceivedEvent.data.identity.id).toBe(sessionB.accountController.identity.address.toString());

        expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).toBe(true);
        expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).toBe(relationshipChangedEvent.data.id);
        expect(onboardingChangeReceivedEvent.data.relationship).toBe(relationshipChangedEvent.data);
    });

    test("should fire events on the requestor when relationship request was revoked (by requestor itself)", async function () {
        const eventListenerFrom = new EventListener(runtime, [RelationshipChangedEvent], sessionB);
        eventListenerFrom.start();
        await TestUtil.revokeRelationship(sessionB, relationshipId);
        eventListenerFrom.stop();

        const eventsFrom = eventListenerFrom.getReceivedEvents();
        expect(eventsFrom).toHaveLength(1);
        const relationshipChangedEvent = eventsFrom[0].instance as RelationshipChangedEvent;
        expect(relationshipChangedEvent).toBeInstanceOf(RelationshipChangedEvent);
        expect(relationshipChangedEvent.data).toBeDefined();
        expect(relationshipChangedEvent.data.status).toBe(RelationshipStatus.Revoked);
    });

    test("should fire events on the templator when relationship request was revoked", async function () {
        const eventListenerTo = new EventListener(runtime, [RelationshipChangedEvent, OnboardingChangeReceivedEvent], sessionA);
        eventListenerTo.start();
        await eventListenerTo.waitFor(OnboardingChangeReceivedEvent, () => TestUtil.syncUntilHasRelationship(sessionA, relationshipId));
        eventListenerTo.stop();

        const events = eventListenerTo.getReceivedEvents();
        expect(events).toHaveLength(2);
        const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent;
        expect(relationshipChangedEvent).toBeInstanceOf(RelationshipChangedEvent);
        expect(relationshipChangedEvent.data).toBeDefined();
        expect(relationshipChangedEvent.data.id).toBe(relationshipId);
        expect(relationshipChangedEvent.data.status).toBe(RelationshipStatus.Revoked);

        const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent;
        expect(onboardingChangeReceivedEvent).toBeInstanceOf(OnboardingChangeReceivedEvent);
        expect(onboardingChangeReceivedEvent.data).toBeDefined();
        expect(onboardingChangeReceivedEvent.data.change.status).toBe(RelationshipChangeStatus.Revoked);
        expect(onboardingChangeReceivedEvent.data.change).toBe(relationshipChangedEvent.data.changes[0]);
        expect(onboardingChangeReceivedEvent.data.identity).toBeDefined();

        expect(onboardingChangeReceivedEvent.data.identity.name).toBe(sessionB.accountController.identity.address.toString().substring(3, 9));
        expect(onboardingChangeReceivedEvent.data.identity.id).toBe(sessionB.accountController.identity.address.toString());
        expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).toBe(true);
        expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).toBe(relationshipChangedEvent.data.id);

        expect(onboardingChangeReceivedEvent.data.relationship).toBe(relationshipChangedEvent.data);
    });
});
