import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, CachedRelationship, Identity, Relationship, RelationshipStatus, RelationshipTemplate, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("RelationshipsController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let sender: AccountController;
    let recipient1: AccountController;
    let relId1: CoreId;
    let recipient2: AccountController;
    let recipient3: AccountController;
    let senderRel: Relationship;
    let recipientRel: Relationship;
    let tempDate: CoreDate;

    function expectValidActiveFreshRelationship(relationship: Relationship, _: AccountController, peerAccount: AccountController, creationTime: CoreDate) {
        expect(relationship.id).toBeInstanceOf(CoreId);
        expect(relationship.status).toStrictEqual(RelationshipStatus.Active);
        expect(relationship.peer).toBeInstanceOf(Identity);
        expect(relationship.peer.address).toStrictEqual(peerAccount.identity.address);

        expect(relationship.cache!.template).toBeInstanceOf(RelationshipTemplate);

        expect(relationship.cache).toBeInstanceOf(CachedRelationship);
        expect(relationship.cachedAt).toBeInstanceOf(CoreDate);
        expect(relationship.cachedAt!.isWithin(TestUtil.tempDateThreshold, TestUtil.tempDateThreshold, creationTime)).toBe(true);
        expect(relationship.cache!.creationContent).toBeDefined();

        expect(relationship.cache!.lastMessageReceivedAt).toBeUndefined();
        expect(relationship.cache!.lastMessageSentAt).toBeUndefined();
        expect(relationship.relationshipSecretId).toBeDefined();
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 4);
        sender = accounts[0];
        recipient1 = accounts[1];
        recipient2 = accounts[2];
        recipient3 = accounts[3];
    });

    afterAll(async function () {
        await sender.close();
        await recipient1.close();
        await recipient2.close();
        await recipient3.close();
        await connection.close();
    });

    test("should return an empty relationships array", async function () {
        const relationships = await sender.relationships.getRelationships();
        expect(relationships).toHaveLength(0);
    });

    test("should create a relationship and get it afterwards by the address", async function () {
        tempDate = CoreDate.utc();
        await TestUtil.addRelationship(sender, recipient1);
        senderRel = (await sender.relationships.getActiveRelationshipToIdentity(recipient1.identity.address))!;
        relId1 = senderRel.id;
        recipientRel = (await recipient1.relationships.getActiveRelationshipToIdentity(sender.identity.address))!;
        expect(senderRel).toBeDefined();
        expect(recipientRel).toBeDefined();
        expect(senderRel.id.toString()).toStrictEqual(recipientRel.id.toString());
    });

    test("should set all the required relationship properties", function () {
        expectValidActiveFreshRelationship(senderRel, sender, recipient1, tempDate);
        expect(senderRel.metadata).toBeUndefined();
        expect(senderRel.metadataModifiedAt).toBeUndefined();
        expectValidActiveFreshRelationship(recipientRel, recipient1, sender, tempDate);
        expect(recipientRel.metadata).toBeUndefined();
        expect(recipientRel.metadataModifiedAt).toBeUndefined();
    });

    test("should set and get additional metadata", async function () {
        await sender.relationships.setRelationshipMetadata(senderRel, { myprop: true });
        const senderRel2 = (await sender.relationships.getRelationship(senderRel.id))!;
        expectValidActiveFreshRelationship(senderRel2, sender, recipient1, tempDate);
        expect(senderRel2.metadata).toBeDefined();
        expect(senderRel2.metadata["myprop"]).toBe(true);
        expect(senderRel2.metadataModifiedAt).toBeDefined();
        expect(senderRel2.metadataModifiedAt!.isWithin(TestUtil.tempDateThreshold)).toBe(true);
    });

    describe("Requestor", function () {
        test("should get the cached relationships", async function () {
            const relationships = await sender.relationships.getRelationships();
            expect(relationships).toHaveLength(1);
            const rel1 = relationships[0];
            expect(rel1.cache).toBeDefined();
            expect(rel1.cachedAt).toBeDefined();
        });

        test("should access the relationship cache by using get", async function () {
            const relationship = await sender.relationships.getRelationship(relId1);
            expectValidActiveFreshRelationship(relationship!, sender, recipient1, tempDate);
        });

        test("should create a new relationship to another recipient", async function () {
            tempDate = CoreDate.utc();
            await TestUtil.addRelationship(sender, recipient2);
            senderRel = (await sender.relationships.getActiveRelationshipToIdentity(recipient2.identity.address))!;
            expectValidActiveFreshRelationship(senderRel, sender, recipient2, tempDate);
        });

        test("should not create new relationship if templator has been deleted after requestor has loaded the template", async function () {
            const loadedTemplate = await TestUtil.exchangeTemplate(recipient3, sender);

            await recipient3.identityDeletionProcess.initiateIdentityDeletionProcess(0);
            await TestUtil.runDeletionJob();

            await sender.syncEverything();

            const canSendRelationshipResult = await sender.relationships.canSendRelationship({
                template: loadedTemplate,
                creationContent: {
                    mycontent: "request"
                }
            });
            expect(canSendRelationshipResult.isSuccess).toBe(false);
            expect(canSendRelationshipResult.error.code).toBe("error.transport.relationships.deletedOwnerOfRelationshipTemplate");
            expect(canSendRelationshipResult.error.message).toContain(
                "The Identity that created the RelationshipTemplate has been deleted in the meantime. Thus, it is not possible to establish a Relationship to it."
            );

            await expect(
                sender.relationships.sendRelationship({
                    template: loadedTemplate,
                    creationContent: {
                        mycontent: "request"
                    }
                })
            ).rejects.toThrow("error.transport.relationships.deletedOwnerOfRelationshipTemplate");
        });
    });

    describe("Templator", function () {
        test("should get the cached relationships", async function () {
            const relationships = await recipient1.relationships.getRelationships();
            expect(relationships).toHaveLength(1);
            const rel1 = relationships[0];
            expect(rel1.cache).toBeDefined();
            expect(rel1.cachedAt).toBeDefined();
        });

        test("should access the relationship cache by using get", async function () {
            const relationship = await recipient1.relationships.getRelationship(relId1);
            expectValidActiveFreshRelationship(relationship!, recipient1, sender, tempDate);
        });

        test("should create a new relationship to another recipient", async function () {
            tempDate = CoreDate.utc();
            await TestUtil.addRelationship(recipient1, recipient2);
            senderRel = (await recipient1.relationships.getActiveRelationshipToIdentity(recipient2.identity.address))!;
            expectValidActiveFreshRelationship(senderRel, recipient1, recipient2, tempDate);
        });

        test("should have cached the relationship to another recipient", async function () {
            const relationships = await recipient1.relationships.getRelationships();
            expect(relationships).toHaveLength(2);
            const rel1 = relationships[0];
            expect(rel1.cache).toBeDefined();
            expect(rel1.cachedAt).toBeDefined();
            const rel2 = relationships[1];
            expectValidActiveFreshRelationship(rel2, recipient1, recipient2, tempDate);
        });
    });
});
