import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, TokenContentRelationshipTemplate, Transport } from "../../../src";
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
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
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

        const templateReference = sentRelationshipTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);
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

        const templateReference = sentRelationshipTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);
        tempId2 = sentRelationshipTemplate.id;

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should send and receive a third RelationshipTemplate", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const templateReference = sentRelationshipTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);
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

        const templateReference = ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(templateReference);
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

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl));
        expect(peerTemplate).toBeDefined();
    });

    test("should throw an error if loaded by the wrong identity", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            forIdentity: sender.identity.address
        });
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl))).rejects.toThrow(
            "transport.general.notIntendedForYou"
        );
    });

    test("should throw an error if loaded by the wrong identity and it's uncaught before reaching the Backbone", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            forIdentity: sender.identity.address
        });

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: ownTemplate.id,
            secretKey: ownTemplate.secretKey
        });
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(tokenContent)).rejects.toThrow("error.platform.recordNotFound");
    });

    test("should create and load a password-protected template", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            passwordProtection: {
                password: "password",
                passwordType: "pw"
            }
        });
        expect(ownTemplate).toBeDefined();
        expect(ownTemplate.passwordProtection!.password).toBe("password");
        expect(ownTemplate.passwordProtection!.salt).toBeDefined();
        expect(ownTemplate.passwordProtection!.salt).toHaveLength(16);
        expect(ownTemplate.passwordProtection!.passwordType).toBe("pw");

        const reference = ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
        expect(reference.passwordProtection!.passwordType).toBe("pw");
        expect(reference.passwordProtection!.salt).toStrictEqual(ownTemplate.passwordProtection!.salt);

        const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference, "password");
        expect(peerTemplate).toBeDefined();
        expect(peerTemplate.passwordProtection!.password).toBe("password");
        expect(peerTemplate.passwordProtection!.salt).toStrictEqual(ownTemplate.passwordProtection!.salt);
        expect(peerTemplate.passwordProtection!.passwordType).toBe("pw");
    });

    test("should throw an error if loaded with a wrong or missing password", async function () {
        const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            passwordProtection: {
                password: "1234",
                passwordType: "pin4"
            }
        });
        expect(ownTemplate).toBeDefined();

        await expect(
            recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl), "wrongPassword")
        ).rejects.toThrow(
            "error.platform.recordNotFound (404): 'RelationshipTemplate not found. Make sure the ID exists and the record is not expired. If a password is required to fetch the record, make sure you passed the correct one.'"
        );
        await expect(recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl))).rejects.toThrow(
            "error.transport.noPasswordProvided"
        );
    });

    test("should fetch multiple password-protected templates", async function () {
        const ownTemplate1 = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            passwordProtection: {
                password: "password",
                passwordType: "pw"
            }
        });
        const ownTemplate2 = await sender.relationshipTemplates.sendRelationshipTemplate({
            content: { a: "A" },
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            passwordProtection: {
                password: "1234",
                passwordType: "pin4"
            }
        });

        await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate1.toRelationshipTemplateReference(sender.config.baseUrl), "password");
        await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(ownTemplate2.toRelationshipTemplateReference(sender.config.baseUrl), "1234");
        const fetchCachesResult = await recipient.relationshipTemplates.fetchCaches([ownTemplate1.id, ownTemplate2.id]);
        expect(fetchCachesResult).toHaveLength(2);
    });

    test("should send and receive a RelationshipTemplate using a truncated RelationshipTemplateReference", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender);

        const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(
            sentRelationshipTemplate.toRelationshipTemplateReference(sender.config.baseUrl)
        );

        expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate);
    });

    test("should clean up relationship templates of a relationship", async function () {
        const relationship = (await TestUtil.addRelationship(sender, recipient)).acceptedRelationshipFromSelf;

        const tokenReference = await TestUtil.sendRelationshipTemplateAndToken(recipient);
        const templateId = (await TestUtil.fetchRelationshipTemplateFromTokenReference(sender, tokenReference)).id;

        await sender.relationshipTemplates.cleanupTemplatesOfDecomposedRelationship(relationship);

        const templateForRelationship = await sender.relationshipTemplates.getRelationshipTemplate(relationship.templateId);
        const otherTemplate = await sender.relationshipTemplates.getRelationshipTemplate(templateId);
        expect(templateForRelationship).toBeUndefined();
        expect(otherTemplate).toBeUndefined();
    });

    describe("RelationshipTemplate deletion", function () {
        let ownTemplate: RelationshipTemplate;
        let peerTemplate: RelationshipTemplate;

        beforeEach(async function () {
            ownTemplate = await TestUtil.sendRelationshipTemplate(sender);

            const reference = ownTemplate.toRelationshipTemplateReference(sender.config.baseUrl);
            peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);
        });

        test("should delete own RelationshipTemplate locally and from the Backbone", async function () {
            await sender.relationshipTemplates.deleteRelationshipTemplate(ownTemplate);
            const templateOnBackbone = await recipient.relationshipTemplates.fetchCaches([ownTemplate.id]);
            expect(templateOnBackbone).toHaveLength(0);

            const localTemplate = await sender.relationshipTemplates.getRelationshipTemplate(ownTemplate.id);
            expect(localTemplate).toBeUndefined();
        });

        test("should delete a peer owned RelationshipTemplate only locally", async function () {
            await recipient.relationshipTemplates.deleteRelationshipTemplate(peerTemplate);
            const templateOnBackbone = await sender.relationshipTemplates.fetchCaches([ownTemplate.id]);
            expect(templateOnBackbone).toHaveLength(1);

            const localTemplate = await recipient.relationshipTemplates.getRelationshipTemplate(ownTemplate.id);
            expect(localTemplate).toBeUndefined();
        });
    });
});
