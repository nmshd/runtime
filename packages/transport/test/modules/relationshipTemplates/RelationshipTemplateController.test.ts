import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, CoreDate, CoreId, RelationshipTemplate, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("RelationshipTemplateController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;

    function expectValidRelationshipTemplates(sentRelationshipTemplate: RelationshipTemplate, receivedRelationshipTemplate: RelationshipTemplate, nowMinusSeconds: CoreDate) {
        expect(sentRelationshipTemplate.id.toString()).toBe(receivedRelationshipTemplate.id.toString());
        expect(sentRelationshipTemplate.cache).toBeDefined();
        expect(sentRelationshipTemplate.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentRelationshipTemplate.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedRelationshipTemplate.cache).toBeDefined();
        expect(receivedRelationshipTemplate.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedRelationshipTemplate.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentRelationshipTemplate.cache!.createdBy.toString()).toBe(receivedRelationshipTemplate.cache!.createdBy.toString());
        expect(sentRelationshipTemplate.cache!.identity.address.toString()).toBe(receivedRelationshipTemplate.cache!.identity.address.toString());
        expect(JSON.stringify(sentRelationshipTemplate.cache!.content)).toBe(JSON.stringify(receivedRelationshipTemplate.cache!.content));
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        sender = accounts[0];
        recipient = accounts[1];
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();

        await connection.close();
    });

    test("should send and receive a RelationshipTemplate", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(sentRelationshipTemplate.id, sentRelationshipTemplate.secretKey);
        tempId1 = sentRelationshipTemplate.id;

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should get the cached RelationshipTemplate", async function () {
        const sentRelationshipTemplate = await sender.relationshipTemplates.getRelationshipTemplate(tempId1);
        const receivedRelationshipTemplate = await recipient.relationshipTemplates.getRelationshipTemplate(tempId1);
        expect(sentRelationshipTemplate).toBeDefined();
        expect(receivedRelationshipTemplate).toBeDefined();
        expectValidRelationshipTemplates(sentRelationshipTemplate!, receivedRelationshipTemplate!, tempDate);
    });

    test("should send and receive a second RelationshipTemplate", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(sentRelationshipTemplate.id, sentRelationshipTemplate.secretKey);
        tempId2 = sentRelationshipTemplate.id;

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should send and receive a third RelationshipTemplate", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(sentRelationshipTemplate.id, sentRelationshipTemplate.secretKey);

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should get the cached relationshipTemplates", async function () {
        const sentRelationshipTemplates = await sender.relationshipTemplates.getRelationshipTemplates();
        const receivedRelationshipTemplates = await recipient.relationshipTemplates.getRelationshipTemplates();
        expect(sentRelationshipTemplates).toHaveLength(3);
        expect(receivedRelationshipTemplates).toHaveLength(3);
        expect(sentRelationshipTemplates[0].id.toString()).toBe(tempId1.toString());
        expect(sentRelationshipTemplates[1].id.toString()).toBe(tempId2.toString());
        expectValidRelationshipTemplates(sentRelationshipTemplates[0], receivedRelationshipTemplates[0], tempDate);
        expectValidRelationshipTemplates(sentRelationshipTemplates[1], receivedRelationshipTemplates[1], tempDate);
    });

    test("should create templates with maxNumberOfAllocations=undefined", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            maxNumberOfAllocations: undefined
        });
        expect(ownTemplate).toBeDefined();

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(ownTemplate.id, ownTemplate.secretKey);
        expect(peerTemplate).toBeDefined();
    });

    test("should throw an error with maxNumberOfAllocations=0", async function () {
        await TestUtil.expectThrowsAsync(async () => {
            await sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 }),
                maxNumberOfAllocations: 0
            });
        }, /SendRelationshipTemplateParameters.maxNumberOfAllocations/);
    });

    test("should send and receive a RelationshipTemplate using a RelationshipTemplateReference", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(
            sentRelationshipTemplate.toRelationshipTemplateReference()
        );

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should send and receive a RelationshipTemplate using a truncated RelationshipTemplateReference", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(sentRelationshipTemplate.truncate());

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });
});
