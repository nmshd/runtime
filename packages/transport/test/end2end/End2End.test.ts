import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, CoreDate, FileReference, RelationshipAuditLogEntryReason, RelationshipStatus, TokenContentRelationshipTemplate, Transport } from "../../src";
import { TestUtil } from "../testHelpers/TestUtil";

describe("AccountTest", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);
        await transport.init();
    });

    afterAll(async function () {
        await connection.close();
    });

    test("should close an account", async function () {
        const account = await TestUtil.createAccount(transport);
        await expect(account.close()).resolves.not.toThrow();
    });
});

describe("RelationshipTest: Accept", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();

        await connection.close();
    });

    test("should create new relationship between two accounts", async function () {
        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: templateFrom.id,
            secretKey: templateFrom.secretKey
        });

        const token = await from.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ hours: 12 }),
            ephemeral: false
        });

        const tokenRef = token.truncate();

        const receivedToken = await to.tokens.loadPeerTokenByTruncated(tokenRef, false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplate(receivedToken.cache!.content.templateId, receivedToken.cache!.content.secretKey);

        expect(templateTo.cache!.content).toBeInstanceOf(JSONWrapper);
        const templateContent = templateTo.cache!.content as JSONWrapper;
        expect(templateContent.value).toHaveProperty("mycontent");
        expect(templateContent.value.mycontent).toBe("template");

        // Send Request
        const request = await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: {
                mycontent: "request"
            }
        });
        const relationshipId = request.id;

        const templateRequestContent = request.cache!.template.cache!.content as JSONWrapper;
        expect(templateRequestContent.value).toHaveProperty("mycontent");
        expect(templateRequestContent.value.mycontent).toBe("template");

        expect(request.cache!.template.id.toString()).toStrictEqual(templateTo.id.toString());
        expect(request.cache!.template.isOwn).toBe(false);
        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        expect(request.cache?.auditLog).toHaveLength(1);
        expect(request.cache!.auditLog[0].newStatus).toBe(RelationshipStatus.Pending);

        // Accept relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];

        expect(pendingRelationship.cache!.template.id.toString()).toStrictEqual(templateTo.id.toString());
        expect(pendingRelationship.cache!.template.isOwn).toBe(true);

        const templateResponseContent = pendingRelationship.cache!.template.cache!.content as JSONWrapper;
        expect(templateResponseContent.value).toHaveProperty("mycontent");
        expect(templateResponseContent.value.mycontent).toBe("template");

        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const acceptedRelationshipFromSelf = await from.relationships.accept(relationshipId);
        expect(acceptedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);

        expect(acceptedRelationshipFromSelf.cache?.auditLog).toHaveLength(2);
        expect(acceptedRelationshipFromSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Active);

        expect(acceptedRelationshipFromSelf.peer).toBeDefined();

        // Get accepted relationship
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const acceptedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(acceptedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Active);

        expect(acceptedRelationshipPeer.cache?.auditLog).toHaveLength(2);
        expect(acceptedRelationshipPeer.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Active);
        expect(acceptedRelationshipPeer.peer).toBeDefined();
        expect(acceptedRelationshipPeer.peer.address.toString()).toStrictEqual(templateTo.cache?.identity.address.toString());
    });
});

describe("RelationshipTest: Reject", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should reject a relationship between two accounts", async function () {
        const templateFrom = await from.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: templateFrom.id,
            secretKey: templateFrom.secretKey
        });

        const token = await from.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ hours: 12 }),
            ephemeral: false
        });

        const tokenRef = token.truncate();

        const receivedToken = await to.tokens.loadPeerTokenByTruncated(tokenRef, false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplate(receivedToken.cache!.content.templateId, receivedToken.cache!.content.secretKey);

        expect(templateTo.cache!.content).toBeInstanceOf(JSONWrapper);
        const templateContent = templateTo.cache!.content as JSONWrapper;
        expect(templateContent.value).toHaveProperty("mycontent");
        expect(templateContent.value.mycontent).toBe("template");

        const request = await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: {
                mycontent: "request"
            }
        });
        const relationshipId = request.id;

        const templateRequestContent = request.cache!.template.cache!.content as JSONWrapper;
        expect(templateRequestContent.value).toHaveProperty("mycontent");
        expect(templateRequestContent.value.mycontent).toBe("template");

        expect(request.cache!.template.id.toString()).toStrictEqual(templateTo.id.toString());
        expect(request.cache!.template.isOwn).toBe(false);
        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        // Reject relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];
        expect(pendingRelationship.cache!.template.id.toString()).toStrictEqual(templateTo.id.toString());
        expect(pendingRelationship.cache!.template.isOwn).toBe(true);

        const templateResponseContent = pendingRelationship.cache!.template.cache!.content as JSONWrapper;
        expect(templateResponseContent.value).toHaveProperty("mycontent");
        expect(templateResponseContent.value.mycontent).toBe("template");

        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const rejectedRelationshipFromSelf = await from.relationships.reject(relationshipId);
        expect(rejectedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Rejected);
        expect(rejectedRelationshipFromSelf.cache?.auditLog).toHaveLength(2);
        expect(rejectedRelationshipFromSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Rejected);

        expect(rejectedRelationshipFromSelf.peer).toBeDefined();

        // Get rejected relationship
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const rejectedRelationshipPeer = syncedRelationshipsPeer[0];
        expect(rejectedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Rejected);

        expect(rejectedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Rejected);
        expect(rejectedRelationshipPeer.cache?.auditLog).toHaveLength(2);
        expect(rejectedRelationshipPeer.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Rejected);
        expect(rejectedRelationshipPeer.peer).toBeDefined();
        expect(rejectedRelationshipPeer.peer.address.toString()).toStrictEqual(templateTo.cache?.identity.address.toString());
    });
});

describe("RelationshipTest: Revoke", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let templator: AccountController;
    let requestor: AccountController;

    beforeEach(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        templator = accounts[0];
        requestor = accounts[1];
    });

    afterEach(async function () {
        await templator.close();
        await requestor.close();

        await connection.close();
    });

    test("should revoke a relationship between two accounts", async function () {
        const templateTemplator = await templator.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: templateTemplator.id,
            secretKey: templateTemplator.secretKey
        });

        const token = await templator.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ hours: 12 }),
            ephemeral: false
        });

        const tokenRef = token.truncate();

        const receivedToken = await requestor.tokens.loadPeerTokenByTruncated(tokenRef, false);

        if (!(receivedToken.cache!.content instanceof TokenContentRelationshipTemplate)) {
            throw new Error("token content not instanceof TokenContentRelationshipTemplate");
        }

        const templateRequestor = await requestor.relationshipTemplates.loadPeerRelationshipTemplate(
            receivedToken.cache!.content.templateId,
            receivedToken.cache!.content.secretKey
        );

        expect(templateRequestor.cache!.content).toBeInstanceOf(JSONWrapper);
        const templateContent = templateRequestor.cache!.content as JSONWrapper;
        expect(templateContent.value).toHaveProperty("mycontent");
        expect(templateContent.value.mycontent).toBe("template");

        const request = await requestor.relationships.sendRelationship({
            template: templateRequestor,
            creationContent: {
                mycontent: "request"
            }
        });

        const templateRequestContent = request.cache!.template.cache!.content as JSONWrapper;
        expect(templateRequestContent.value).toHaveProperty("mycontent");
        expect(templateRequestContent.value.mycontent).toBe("template");

        const relationshipId = request.id;

        expect(request.cache!.template.id.toString()).toStrictEqual(templateRequestor.id.toString());
        expect(request.cache!.template.isOwn).toBe(false);
        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        // Revoke relationship
        const syncedRelationships = await TestUtil.syncUntilHasRelationships(templator);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];
        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        expect(pendingRelationship.cache!.template.id.toString()).toStrictEqual(templateRequestor.id.toString());
        expect(pendingRelationship.cache!.template.isOwn).toBe(true);

        const templateResponseContent = pendingRelationship.cache!.template.cache!.content as JSONWrapper;
        expect(templateResponseContent.value).toHaveProperty("mycontent");
        expect(templateResponseContent.value.mycontent).toBe("template");
        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const revokedRelationshipSelf = await requestor.relationships.revoke(relationshipId);
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);

        expect(revokedRelationshipSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);
        expect(revokedRelationshipSelf.cache?.auditLog).toHaveLength(2);
        expect(revokedRelationshipSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Revoked);
        expect(revokedRelationshipSelf.peer).toBeDefined();
        expect(revokedRelationshipSelf.peer.address.toString()).toStrictEqual(revokedRelationshipSelf.cache!.template.cache?.identity.address.toString());

        // Get revoked relationship
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(templator);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const revokedRelationshipPeer = syncedRelationshipsPeer[0];
        expect(revokedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Revoked);
        expect(revokedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Revoked);
        expect(revokedRelationshipPeer.cache?.auditLog).toHaveLength(2);
        expect(revokedRelationshipPeer.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Revoked);
        expect(revokedRelationshipPeer.peer).toBeDefined();
    });

    test("should handle an incoming relationship request which was already revoked by the sender", async function () {
        const templateTemplator = await templator.relationshipTemplates.sendRelationshipTemplate({
            content: {
                mycontent: "template"
            },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            maxNumberOfAllocations: 1
        });

        const templateToken = TokenContentRelationshipTemplate.from({
            templateId: templateTemplator.id,
            secretKey: templateTemplator.secretKey
        });

        const token = await templator.tokens.sendToken({
            content: templateToken,
            expiresAt: CoreDate.utc().add({ hours: 12 }),
            ephemeral: false
        });

        const tokenRef = token.truncate();

        const receivedToken = await requestor.tokens.loadPeerTokenByTruncated(tokenRef, false);

        const receivedTemplateToken = TokenContentRelationshipTemplate.from(receivedToken.cache!.content as TokenContentRelationshipTemplate);

        const templateRequestor = await requestor.relationshipTemplates.loadPeerRelationshipTemplate(receivedTemplateToken.templateId, receivedTemplateToken.secretKey);

        expect(templateRequestor.cache!.content).toBeInstanceOf(JSONWrapper);
        const templateContent = templateRequestor.cache!.content as JSONWrapper;
        expect(templateContent.value).toHaveProperty("mycontent");
        expect(templateContent.value.mycontent).toBe("template");

        const pendingRelationship = await requestor.relationships.sendRelationship({
            template: templateRequestor,
            creationContent: {
                mycontent: "request"
            }
        });

        // Revoke relationship
        const revokedRelationshipSelf = await requestor.relationships.revoke(pendingRelationship.id);
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);

        // Get revoked relationship
        await TestUtil.syncUntilHasRelationships(templator, 2); // wait for pending and revoked
        const relationshipsPeer = await templator.relationships.getRelationships({});
        expect(relationshipsPeer).toHaveLength(1);
        const revokedRelationshipPeer = relationshipsPeer[0];
        expect(revokedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Revoked);
    });
});

describe("RelationshipTest: Terminate", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should terminate a relationship between two accounts", async function () {
        const relationshipId = (await TestUtil.addRelationship(from, to))[0].id;

        const terminatedRelationshipFromSelf = await from.relationships.terminate(relationshipId);
        expect(terminatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(terminatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(terminatedRelationshipFromSelf.cache?.auditLog).toHaveLength(3);
        expect(terminatedRelationshipFromSelf.cache!.auditLog[2].newStatus).toBe(RelationshipStatus.Terminated);

        // Get terminated relationship
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const terminatedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(terminatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(terminatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(terminatedRelationshipPeer.cache?.auditLog).toHaveLength(3);
        expect(terminatedRelationshipPeer.cache!.auditLog[2].newStatus).toBe(RelationshipStatus.Terminated);
    });
});

describe.skip("RelationshipTest: Accept Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should request reactivating a relationship between two accounts and accept the reactivation", async function () {
        const relationshipId = (await TestUtil.addRelationship(from, to))[0].id;
        await from.relationships.terminate(relationshipId);
        await from.relationships.reactivate(relationshipId);

        // Accept the reactivation
        await TestUtil.syncUntilHasRelationships(to);
        const acceptedReactivatedRelationshipPeer = await to.relationships.acceptReactivation(relationshipId);
        expect(acceptedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Active);
        expect(acceptedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(acceptedReactivatedRelationshipPeer.cache!.auditLog[4].newStatus).toBe(RelationshipStatus.Active);

        // Get relationship with accepted reactivation
        const syncedRelationshipsFromSelf = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationshipsFromSelf).toHaveLength(1);
        const acceptedReactivatedRelationshipFromSelf = syncedRelationshipsFromSelf[0];

        expect(acceptedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);
        expect(acceptedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(acceptedReactivatedRelationshipFromSelf.cache!.auditLog[4].newStatus).toBe(RelationshipStatus.Active);
    });
});

describe.skip("RelationshipTest: Reject Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should request reactivating a relationship between two accounts and reject the reactivation", async function () {
        const relationshipId = (await TestUtil.addRelationship(from, to))[0].id;
        await from.relationships.terminate(relationshipId);
        await from.relationships.reactivate(relationshipId);

        // Reject the reactivation
        await TestUtil.syncUntilHasRelationships(to);
        const rejectedReactivatedRelationshipPeer = await to.relationships.rejectReactivation(relationshipId);
        expect(rejectedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(rejectedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(rejectedReactivatedRelationshipPeer.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RejectionOfReactivation);

        // Get relationship with rejected reactivation
        const syncedRelationshipsFromSelf = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationshipsFromSelf).toHaveLength(1);
        const rejectedReactivatedRelationshipFromSelf = syncedRelationshipsFromSelf[0];

        expect(rejectedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(rejectedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(rejectedReactivatedRelationshipFromSelf.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RejectionOfReactivation);
    });
});

describe.skip("RelationshipTest: Revoke Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should request reactivating a relationship between two accounts and revoke the reactivation", async function () {
        const relationshipId = (await TestUtil.addRelationship(from, to))[0].id;
        await from.relationships.terminate(relationshipId);
        await from.relationships.reactivate(relationshipId);

        // Revoke the reactivation
        const revokedReactivatedRelationshipFromSelf = await from.relationships.revokeReactivation(relationshipId);
        expect(revokedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(revokedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(revokedReactivatedRelationshipFromSelf.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RevocationOfReactivation);

        // Get relationship with revoked reactivation
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const revokedReactivatedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(revokedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(revokedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(revokedReactivatedRelationshipPeer.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RevocationOfReactivation);
    });
});

describe.skip("RelationshipTest: Decompose", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should request decomposing a relationship", async function () {
        const relationshipId = (await TestUtil.addRelationship(from, to))[0].id;
        await from.relationships.terminate(relationshipId);

        // Decompose
        await from.relationships.decompose(relationshipId);
        const decomposedRelationship = await from.relationships.getRelationship(relationshipId);
        expect(decomposedRelationship).toBeUndefined();

        // Get relationship that is decomposed by peer
        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const decomposedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(decomposedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(decomposedRelationshipPeer.status).toStrictEqual(RelationshipStatus.DeletionProposed);
        expect(decomposedRelationshipPeer.cache?.auditLog).toHaveLength(4);
        expect(decomposedRelationshipPeer.cache!.auditLog[3].reason).toBe(RelationshipAuditLogEntryReason.Decomposition);
    });
});

describe("MessageTest", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);

        from = accounts[0];
        to = accounts[1];
        await TestUtil.addRelationship(from, to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should send a message between the accounts", async function () {
        const message = await from.messages.sendMessage({
            recipients: [to.identity.address],
            content: { body: "Test Body", subject: "Test Subject" }
        });

        expect(message).toBeDefined();
    });
});

describe("TokenTest", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let from: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        from = accounts[0];
    });

    afterAll(async function () {
        await from.close();

        await connection.close();
    });

    test("should create a token and read it afterwards", async function () {
        const token = await from.tokens.sendToken({
            content: Serializable.fromAny({ content: "someContent" }),
            expiresAt: CoreDate.utc().add({ minutes: 10 }),
            ephemeral: false
        });

        expect(token).toBeDefined();
    });
});

describe("FileTest", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let from: AccountController;
    let to: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);

        from = accounts[0];
        to = accounts[1];
    });

    afterAll(async function () {
        await from.close();
        await to.close();

        await connection.close();
    });

    test("should upload a file directly and download it afterwards", async function () {
        const content = CoreBuffer.fromUtf8("abcd");

        const file = await TestUtil.uploadFile(from, content);
        const ref: any = file.toFileReference().toJSON();

        const parcelRef = FileReference.from(ref);

        const downloadedFile = await to.files.getOrLoadFileByReference(parcelRef);

        const downloadedContent = await to.files.downloadFileContent(downloadedFile);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });

    test("should again upload a file directly and download it afterwards from the same account", async function () {
        const content = CoreBuffer.fromUtf8("abcd");

        const file = await TestUtil.uploadFile(from, content);

        const ref: any = file.toFileReference().toJSON();

        const parcelRef = FileReference.from(ref);

        const downloadedFile = await from.files.getOrLoadFileByReference(parcelRef);

        const downloadedContent = await from.files.downloadFileContent(downloadedFile);

        expect(content.toArray()).toStrictEqual(downloadedContent.toArray());
    });
});
