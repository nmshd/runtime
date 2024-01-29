import { sleep } from "@js-soft/ts-utils";
import { BackboneIds } from "@nmshd/transport";
import { AppRuntime, LocalAccountSession } from "../../src";
import { TestUtil } from "../lib";

let runtime: AppRuntime;
let session1: LocalAccountSession;
let session2: LocalAccountSession;
let session3: LocalAccountSession;

let relationshipId: string;

describe("AppRelationshipFacade", function () {
    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        session1 = await TestUtil.createSession(runtime);
        session2 = await TestUtil.createSession(runtime);
        session3 = await TestUtil.createSession(runtime);

        const relationships = await TestUtil.addRelationship(session1, session2);

        await TestUtil.addRejectedRelationship(session3, session2);

        relationshipId = relationships.from.id.toString();

        await TestUtil.sendMessage(session1, session2);
        await TestUtil.sendMessage(session1, session2);
        await TestUtil.sendMessage(session1, session2);
        await sleep(300);
        await session2.transportServices.account.syncEverything();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should have created two different sessions", function () {
        expect(session1).toBeDefined();
        expect(session2).toBeDefined();
        expect(session3).toBeDefined();

        const session1Address = session1.accountController.identity.identity.address.toString();
        const session2Address = session2.accountController.identity.identity.address.toString();
        const session3Address = session3.accountController.identity.identity.address.toString();
        expect(session1Address).not.toBe(session2Address);
        expect(session1Address).not.toBe(session3Address);
    });

    test("should have created a relationship", function () {
        expect(relationshipId).toBeDefined();
        expect(BackboneIds.relationship.validate(relationshipId)).toBe(true);
    });

    describe("Render Relationships", function () {
        test("should render all relationships", async function () {
            const result = await session2.appServices.relationships.renderAllRelationships();
            TestUtil.expectSuccess(result);

            expect(result.value).toHaveLength(2);
        });

        test("should render active relationships", async function () {
            const result = await session2.appServices.relationships.renderActiveRelationships();
            TestUtil.expectSuccess(result);
            expect(result.value).toHaveLength(1);
        });
    });

    test("should render relationshipItems", async function () {
        const result = await session2.appServices.relationships.renderRelationshipItems(relationshipId, 2);
        TestUtil.expectSuccess(result);

        const items = result.value;

        expect(items).toHaveLength(2);
        expect(new Date(items[0].date!).getTime()).toBeGreaterThan(new Date(items[1].date!).getTime());
    });
});
