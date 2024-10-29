import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, Transport } from "../../../src";
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
        await expect(async () => {
            await sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 }),
                maxNumberOfAllocations: 0
            });
        }).rejects.toThrow(/SendRelationshipTemplateParameters.maxNumberOfAllocations/);
    });

    test("should create and load a personalized template", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            forIdentity: recipient.identity.address
        });
        expect(ownTemplate).toBeDefined();

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate());
        expect(peerTemplate).toBeDefined();
    });

    test("should throw an error if loaded by the wrong identity", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            forIdentity: sender.identity.address
        });
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate())).rejects.toThrow(
            "transport.general.notIntendedForYou"
        );
    });

    test("should throw an error if loaded by the wrong identity and it's uncaught before reaching the backbone", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            forIdentity: sender.identity.address
        });

        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplate(ownTemplate.id, ownTemplate.secretKey)).rejects.toThrow("error.platform.recordNotFound");
    });

    test("should create and load a password-protected template", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            password: "password"
        });
        expect(ownTemplate).toBeDefined();
        expect(ownTemplate.password).toBe("password");
        expect(ownTemplate.salt).toBeDefined();
        expect(ownTemplate.salt?.length).toBe(16);
        const reference = ownTemplate.toRelationshipTemplateReference();
        expect(reference.passwordType).toBe("pw");
        expect(reference.salt).toStrictEqual(ownTemplate.salt);

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(reference.truncate(), "password");
        expect(peerTemplate).toBeDefined();
        expect(peerTemplate.password).toBe("password");
        expect(peerTemplate.salt).toStrictEqual(ownTemplate.salt);
    });

    test("should create and load a PIN-protected template", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            pin: "1234"
        });
        expect(ownTemplate).toBeDefined();
        expect(ownTemplate.pin).toBe("1234");
        expect(ownTemplate.salt).toBeDefined();
        expect(ownTemplate.salt?.length).toBe(16);
        const reference = ownTemplate.toRelationshipTemplateReference();
        expect(reference.passwordType).toBe("pin4");
        expect(reference.salt).toStrictEqual(ownTemplate.salt);

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(reference.truncate(), undefined, "1234");
        expect(peerTemplate).toBeDefined();
        expect(peerTemplate.pin).toBe("1234");
        expect(peerTemplate.salt).toStrictEqual(ownTemplate.salt);
    });

    test("should throw an error if created with password and PIN", async function () {
        await expect(
            sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 }),
                password: "password",
                pin: "1234"
            })
        ).rejects.toThrow("error.transport.notBothPasswordAndPin");
    });

    test("should throw an error if loaded with a wrong or missing password", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            password: "password"
        });
        expect(ownTemplate).toBeDefined();

        await expect(
            recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate(), "wrongPassword")
        ).rejects.toThrow("error.platform.recordNotFound");
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate())).rejects.toThrow(
            "error.transport.noPasswordProvided"
        );
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplate(ownTemplate.id, ownTemplate.secretKey)).rejects.toThrow("error.platform.recordNotFound");
    });

    test("should throw an error if loaded with a wrong or missing PIN", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            pin: "1234"
        });
        expect(ownTemplate).toBeDefined();

        await expect(
            recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate(), undefined, "12345")
        ).rejects.toThrow("error.platform.recordNotFound");
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate.toRelationshipTemplateReference().truncate())).rejects.toThrow(
            "error.transport.noPINProvided"
        );
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplate(ownTemplate.id, ownTemplate.secretKey)).rejects.toThrow("error.platform.recordNotFound");
    });

    test("should fetch multiple password-protected templates", async function () {
        const ownTemplate1 = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            password: "password"
        });
        const ownTemplate2 = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            password: "password"
        });

        await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate1.toRelationshipTemplateReference().truncate(), "password");
        await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(ownTemplate2.toRelationshipTemplateReference().truncate(), "password");
        const fetchCachesResult = await recipient.relationshipTemplates.fetchCaches([ownTemplate1.id, ownTemplate2.id]);
        expect(fetchCachesResult).toHaveLength(2);
    });

    describe("should correctly compute the password type", function () {
        test("should get password type undefined if no password is given", async function () {
            const template = await sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 })
            });
            const reference = template.toRelationshipTemplateReference();
            expect(reference.passwordType).toBeUndefined();
        });

        test("should get password type pw if a password is given", async function () {
            const template = await sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 }),
                password: "password"
            });
            const reference = template.toRelationshipTemplateReference();
            expect(reference.passwordType).toBe("pw");
        });

        test("should get the PIN length if a PIN is given", async function () {
            const template = await sender.relationshipTemplates.sendRelationshipTemplate({
                content: { a: "A" },
                expiresAt: CoreDate.utc().add({ minutes: 1 }),
                pin: "1234"
            });
            const reference = template.toRelationshipTemplateReference();
            expect(reference.passwordType).toBe("pin4");
        });
    });

    test("should send and receive a RelationshipTemplate using a truncated RelationshipTemplateReference", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);
        expect(sentRelationshipTemplate.toRelationshipTemplateReference().version).toBe(1);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(sentRelationshipTemplate.truncate());

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should clean up relationship templates of a relationship", async function () {
        const relationship = (await TestUtil.addRelationship(sender, recipient)).acceptedRelationshipFromSelf;

        const tokenReference = await TestUtil.sendRelationshipTemplateAndToken(recipient);
        const templateId = (await TestUtil.fetchRelationshipTemplateFromTokenReference(sender, tokenReference)).id;

        await sender.relationshipTemplates.cleanupTemplatesOfDecomposedRelationship(relationship);

        const templateForRelationship = await sender.relationshipTemplates.getRelationshipTemplate(relationship.cache!.template.id);
        const otherTemplate = await sender.relationshipTemplates.getRelationshipTemplate(templateId);
        expect(templateForRelationship).toBeUndefined();
        expect(otherTemplate).toBeUndefined();
    });
});
