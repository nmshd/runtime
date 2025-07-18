import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { RelationshipStatus } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("RelationshipSync", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("syncDatawallet should sync relationships", async function () {
        const templatorDevice = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const { device1: requestorDevice1, device2: requestorDevice2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        const templateOnTemplatorDevice = await templatorDevice.relationshipTemplates.sendRelationshipTemplate({
            content: { someTemplateContent: "someTemplateContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference(templatorDevice.config.baseUrl);
        const templateOnRequestorDevice1 = await requestorDevice1.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);

        const createdRelationship = await requestorDevice1.relationships.sendRelationship({
            template: templateOnRequestorDevice1,
            creationContent: { someMessageContent: "someMessageContent" }
        });

        await requestorDevice1.syncDatawallet();

        let relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice2).toBeUndefined();

        await requestorDevice2.syncDatawallet();

        relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice2).toBeDefined();

        expect(relationshipOnRequestorDevice2!.toJSON()).toStrictEqual(createdRelationship.toJSON());

        await TestUtil.syncUntilHasRelationships(templatorDevice);

        await templatorDevice.relationships.accept(createdRelationship.id);

        let relationshipOnRequestorDevice1 = (await requestorDevice2.relationships.getRelationship(createdRelationship.id))!;
        expect(relationshipOnRequestorDevice1.status).toStrictEqual(RelationshipStatus.Pending);

        await TestUtil.syncUntilHasRelationship(requestorDevice1, relationshipOnRequestorDevice1.id);

        relationshipOnRequestorDevice1 = (await requestorDevice1.relationships.getRelationship(relationshipOnRequestorDevice1.id))!;
        expect(relationshipOnRequestorDevice1.status).toStrictEqual(RelationshipStatus.Active);

        relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(relationshipOnRequestorDevice1.id);
        expect(relationshipOnRequestorDevice2!.status).toStrictEqual(RelationshipStatus.Pending);

        await requestorDevice2.syncDatawallet();

        relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(relationshipOnRequestorDevice1.id);
        expect(relationshipOnRequestorDevice2!.status).toStrictEqual(RelationshipStatus.Active);
    });

    test("syncDatawallet should sync relationships without fetching first", async function () {
        const templatorDevice = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const { device1: requestorDevice1, device2: requestorDevice2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        const templateOnTemplatorDevice = await templatorDevice.relationshipTemplates.sendRelationshipTemplate({
            content: { someTemplateContent: "someTemplateContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference(templatorDevice.config.baseUrl);
        const templateOnRequestorDevice1 = await requestorDevice1.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);

        const createdRelationship = await requestorDevice1.relationships.sendRelationship({
            template: templateOnRequestorDevice1,
            creationContent: { someMessageContent: "someMessageContent" }
        });

        await requestorDevice1.syncDatawallet();

        let relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice2).toBeUndefined();

        const relationships = await TestUtil.syncUntilHasRelationships(templatorDevice);

        const relationshipOnTemplatorDevice = relationships[0];
        await templatorDevice.relationships.accept(relationshipOnTemplatorDevice.id);

        relationshipOnRequestorDevice2 = await requestorDevice2.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice2).toBeUndefined();

        await TestUtil.syncUntilHasRelationship(requestorDevice2, createdRelationship.id);

        relationshipOnRequestorDevice2 = (await requestorDevice2.relationships.getRelationship(createdRelationship.id))!;
        expect(relationshipOnRequestorDevice2.status).toStrictEqual(RelationshipStatus.Active);

        let relationshipOnRequestorDevice1 = await requestorDevice1.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice1!.status).toStrictEqual(RelationshipStatus.Pending);

        await requestorDevice1.syncDatawallet();

        relationshipOnRequestorDevice1 = await requestorDevice1.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnRequestorDevice1!.status).toStrictEqual(RelationshipStatus.Active);
    });

    test("syncDatawallet should sync relationships with two templators", async function () {
        const requestorDevice = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });

        const { device1: templatorDevice1, device2: templatorDevice2 } = await TestUtil.createIdentityWithTwoDevices(connection, { datawalletEnabled: true });

        const templateOnTemplatorDevice = await templatorDevice1.relationshipTemplates.sendRelationshipTemplate({
            content: { someTemplateContent: "someTemplateContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });
        await templatorDevice1.syncDatawallet();

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference(templatorDevice1.config.baseUrl);
        const templateOnRequestorDevice1 = await requestorDevice.relationshipTemplates.loadPeerRelationshipTemplateByReference(reference);

        const createdRelationship = await requestorDevice.relationships.sendRelationship({
            template: templateOnRequestorDevice1,
            creationContent: { someMessageContent: "someMessageContent" }
        });

        await requestorDevice.syncDatawallet();

        const relationshipOnTemplatorDevice2 = await templatorDevice2.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnTemplatorDevice2).toBeUndefined();

        const relationshipOnTemplatorDevice1 = await templatorDevice1.relationships.getRelationship(createdRelationship.id);
        expect(relationshipOnTemplatorDevice1).toBeUndefined();

        await TestUtil.syncUntilHasRelationships(templatorDevice2);

        await templatorDevice2.relationships.accept(createdRelationship.id);

        await templatorDevice2.syncDatawallet();

        let relationshipOnRequestorDevice1 = (await templatorDevice1.relationships.getRelationship(createdRelationship.id))!;
        expect(relationshipOnRequestorDevice1).toBeUndefined();

        await templatorDevice1.syncDatawallet();

        relationshipOnRequestorDevice1 = (await templatorDevice1.relationships.getRelationship(createdRelationship.id))!;
        expect(relationshipOnRequestorDevice1.status).toStrictEqual(RelationshipStatus.Active);

        await TestUtil.syncUntilHasRelationship(requestorDevice, relationshipOnRequestorDevice1.id);

        relationshipOnRequestorDevice1 = (await requestorDevice.relationships.getRelationship(relationshipOnRequestorDevice1.id))!;
        expect(relationshipOnRequestorDevice1.status).toStrictEqual(RelationshipStatus.Active);
    });

    test("syncDatawallet should sync relationship templates", async function () {
        const { device1, device2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const templateOnDevice1 = await device1.relationshipTemplates.sendRelationshipTemplate({
            content: { someTemplateContent: "someTemplateContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 })
        });
        await device1.syncDatawallet();

        let templateOnDevice2 = await device2.relationshipTemplates.getRelationshipTemplate(templateOnDevice1.id);
        expect(templateOnDevice2).toBeUndefined();

        await device2.syncDatawallet();

        templateOnDevice2 = await device2.relationshipTemplates.getRelationshipTemplate(templateOnDevice1.id);
        expect(templateOnDevice2).toBeDefined();
        expect(templateOnDevice2?.cache).toBeDefined();
        expect(templateOnDevice2!.toJSON()).toStrictEqual(templateOnDevice1.toJSON());
    });

    test("Synchronizing after both parties have decomposed simultaneously does not throw", async function () {
        // This is a regression test. In the past, an error was thrown when synchronizing after both parties had decomposed the relationship.
        // This was because an external event for the decomposition of the peer was received during the sync, and the template didn't exist
        // anymore at this time.
        // The important thing here is that after the peer has decomposed, no sync has happened before the other identity decomposes.

        const transport = TestUtil.createTransport();
        const [templator, requestor] = await TestUtil.provideAccounts(transport, connection, 2);

        const relationship = (await TestUtil.addRelationship(requestor, templator)).acceptedRelationshipFromSelf;
        const relationshipId = relationship.id;
        const templateId = relationship.templateId;

        await templator.syncEverything();
        await requestor.syncEverything();

        await requestor.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationship(templator, relationshipId);

        await requestor.relationships.decompose(relationshipId);
        await templator.relationships.decompose(relationshipId);

        const template = await templator.relationshipTemplates.getRelationshipTemplate(templateId);
        await templator.relationshipTemplates.deleteRelationshipTemplate(template!);

        await expect(templator.syncEverything()).resolves.not.toThrow();
    });
});
