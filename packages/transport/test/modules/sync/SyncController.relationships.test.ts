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

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference().truncate();
        const templateOnRequestorDevice1 = await requestorDevice1.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(reference);

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
        expect(relationshipOnRequestorDevice2?.cache).toBeDefined();

        expect(relationshipOnRequestorDevice2!.toJSON()).toStrictEqualExcluding(createdRelationship.toJSON(), "cachedAt");

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

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference().truncate();
        const templateOnRequestorDevice1 = await requestorDevice1.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(reference);

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

        const reference = templateOnTemplatorDevice.toRelationshipTemplateReference().truncate();
        const templateOnRequestorDevice1 = await requestorDevice.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(reference);

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
        expect(templateOnDevice2!.toJSON()).toStrictEqualExcluding(templateOnDevice1.toJSON(), "cachedAt");
    });
});
