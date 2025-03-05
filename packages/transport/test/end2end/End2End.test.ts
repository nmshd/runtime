import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper, Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, FileReference, RelationshipAuditLogEntryReason, RelationshipStatus, TokenContentRelationshipTemplate, Transport } from "../../src";
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

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.cache!.content);

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

        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        expect(request.cache?.auditLog).toHaveLength(1);
        expect(request.cache!.auditLog[0].newStatus).toBe(RelationshipStatus.Pending);

        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];

        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const acceptedRelationshipFromSelf = await from.relationships.accept(relationshipId);
        expect(acceptedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);

        expect(acceptedRelationshipFromSelf.cache?.auditLog).toHaveLength(2);
        expect(acceptedRelationshipFromSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Active);

        expect(acceptedRelationshipFromSelf.peer).toBeDefined();

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

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.cache!.content);

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

        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        const syncedRelationships = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];

        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const rejectedRelationshipFromSelf = await from.relationships.reject(relationshipId);
        expect(rejectedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Rejected);
        expect(rejectedRelationshipFromSelf.cache?.auditLog).toHaveLength(2);
        expect(rejectedRelationshipFromSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Rejected);

        expect(rejectedRelationshipFromSelf.peer).toBeDefined();

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

        const templateRequestor = await requestor.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.cache!.content);

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

        const relationshipId = request.id;

        expect(request.status).toStrictEqual(RelationshipStatus.Pending);

        const syncedRelationships = await TestUtil.syncUntilHasRelationships(templator);
        expect(syncedRelationships).toHaveLength(1);
        const pendingRelationship = syncedRelationships[0];
        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        expect(pendingRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        const revokedRelationshipSelf = await requestor.relationships.revoke(relationshipId);
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);

        expect(revokedRelationshipSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);
        expect(revokedRelationshipSelf.cache?.auditLog).toHaveLength(2);
        expect(revokedRelationshipSelf.cache!.auditLog[1].newStatus).toBe(RelationshipStatus.Revoked);

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

        const templateRequestor = await requestor.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedTemplateToken);

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

        const revokedRelationshipSelf = await requestor.relationships.revoke(pendingRelationship.id);
        expect(revokedRelationshipSelf.status).toStrictEqual(RelationshipStatus.Revoked);

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
        const relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;

        const terminatedRelationshipFromSelf = await from.relationships.terminate(relationshipId);
        expect(terminatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(terminatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(terminatedRelationshipFromSelf.cache?.auditLog).toHaveLength(3);
        expect(terminatedRelationshipFromSelf.cache!.auditLog[2].reason).toBe(RelationshipAuditLogEntryReason.Termination);

        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const terminatedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(terminatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(terminatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(terminatedRelationshipPeer.cache?.auditLog).toHaveLength(3);
        expect(terminatedRelationshipPeer.cache!.auditLog[2].reason).toBe(RelationshipAuditLogEntryReason.Termination);
    });
});

describe("RelationshipTest: Request Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should request reactivating a relationship between two accounts", async function () {
        const reactivationRequestedRelationshipFromSelf = await from.relationships.requestReactivation(relationshipId);

        expect(reactivationRequestedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(reactivationRequestedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(reactivationRequestedRelationshipFromSelf.cache?.auditLog).toHaveLength(4);
        expect(reactivationRequestedRelationshipFromSelf.cache!.auditLog[3].reason).toBe(RelationshipAuditLogEntryReason.ReactivationRequested);

        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const reactivationRequestedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(reactivationRequestedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(reactivationRequestedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(reactivationRequestedRelationshipPeer.cache?.auditLog).toHaveLength(4);
        expect(reactivationRequestedRelationshipPeer.cache!.auditLog[3].reason).toBe(RelationshipAuditLogEntryReason.ReactivationRequested);
    });
});

describe("RelationshipTest: Accept Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
        await from.relationships.requestReactivation(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should accept the reactivation of a relationship between two accounts", async function () {
        const acceptedReactivatedRelationshipPeer = await to.relationships.acceptReactivation(relationshipId);
        expect(acceptedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Active);
        expect(acceptedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(acceptedReactivatedRelationshipPeer.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.AcceptanceOfReactivation);

        const syncedRelationshipsFromSelf = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationshipsFromSelf).toHaveLength(1);
        const acceptedReactivatedRelationshipFromSelf = syncedRelationshipsFromSelf[0];

        expect(acceptedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(acceptedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Active);
        expect(acceptedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(acceptedReactivatedRelationshipFromSelf.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.AcceptanceOfReactivation);
    });
});

describe("RelationshipTest: Reject Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
        await from.relationships.requestReactivation(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should reject the reactivation  of a relationship between two accounts", async function () {
        const rejectedReactivatedRelationshipPeer = await to.relationships.rejectReactivation(relationshipId);
        expect(rejectedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(rejectedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(rejectedReactivatedRelationshipPeer.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RejectionOfReactivation);

        const syncedRelationshipsFromSelf = await TestUtil.syncUntilHasRelationships(from);
        expect(syncedRelationshipsFromSelf).toHaveLength(1);
        const rejectedReactivatedRelationshipFromSelf = syncedRelationshipsFromSelf[0];

        expect(rejectedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(rejectedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(rejectedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(rejectedReactivatedRelationshipFromSelf.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RejectionOfReactivation);
    });
});

describe("RelationshipTest: Revoke Reactivation", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
        await from.relationships.requestReactivation(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should revoke the reactivation  of a relationship between two accounts", async function () {
        const revokedReactivatedRelationshipFromSelf = await from.relationships.revokeReactivation(relationshipId);
        expect(revokedReactivatedRelationshipFromSelf.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedReactivatedRelationshipFromSelf.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(revokedReactivatedRelationshipFromSelf.cache?.auditLog).toHaveLength(5);
        expect(revokedReactivatedRelationshipFromSelf.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RevocationOfReactivation);

        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const revokedReactivatedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(revokedReactivatedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(revokedReactivatedRelationshipPeer.status).toStrictEqual(RelationshipStatus.Terminated);
        expect(revokedReactivatedRelationshipPeer.cache?.auditLog).toHaveLength(5);
        expect(revokedReactivatedRelationshipPeer.cache!.auditLog[4].reason).toBe(RelationshipAuditLogEntryReason.RevocationOfReactivation);
    });
});

describe("RelationshipTest: Decompose", function () {
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
        const relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);

        await from.relationships.decompose(relationshipId);
        const decomposedRelationship = await from.relationships.getRelationship(relationshipId);
        expect(decomposedRelationship).toBeUndefined();

        const syncedRelationshipsPeer = await TestUtil.syncUntilHasRelationships(to);
        expect(syncedRelationshipsPeer).toHaveLength(1);
        const decomposedRelationshipPeer = syncedRelationshipsPeer[0];

        expect(decomposedRelationshipPeer.id.toString()).toStrictEqual(relationshipId.toString());
        expect(decomposedRelationshipPeer.status).toStrictEqual(RelationshipStatus.DeletionProposed);
        expect(decomposedRelationshipPeer.cache?.auditLog).toHaveLength(4);
        expect(decomposedRelationshipPeer.cache!.auditLog[3].reason).toBe(RelationshipAuditLogEntryReason.Decomposition);

        await expect(to.relationships.decompose(relationshipId)).resolves.not.toThrow();
    });
});

describe("RelationshipTest: validations for non-existent record", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;
    let from: AccountController;
    const fakeRelationshipId = CoreId.from("REL00000000000000000");

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

    test("should not accept a relationship", async function () {
        await expect(from.relationships.accept(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not reject a relationship", async function () {
        await expect(from.relationships.reject(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not revoke a relationship", async function () {
        await expect(from.relationships.revoke(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not terminate a relationship", async function () {
        await expect(from.relationships.terminate(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not request a relationship reactivation", async function () {
        await expect(from.relationships.requestReactivation(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not accept a relationship reactivation", async function () {
        await expect(from.relationships.acceptReactivation(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not reject a relationship reactivation", async function () {
        await expect(from.relationships.rejectReactivation(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not revoke a relationship reactivation", async function () {
        await expect(from.relationships.revokeReactivation(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });

    test("should not decompose a relationship", async function () {
        await expect(from.relationships.decompose(fakeRelationshipId)).rejects.toThrow("error.transport.recordNotFound");
    });
});

describe("RelationshipTest: validations (on terminated relationship)", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
        await from.relationships.terminate(relationshipId);
        await TestUtil.syncUntilHasRelationships(to);
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should not terminate a relationship in status terminated again", async function () {
        await expect(from.relationships.terminate(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("reactivation revocation should fail without reactivation request", async function () {
        await expect(from.relationships.rejectReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.reactivationNotRequested");
    });

    test("reactivation acceptance should fail without reactivation request", async function () {
        await expect(from.relationships.acceptReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.reactivationNotRequested");
    });

    test("reactivation rejection should fail without reactivation request", async function () {
        await expect(from.relationships.rejectReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.reactivationNotRequested");
    });

    describe("after reactivation request", function () {
        beforeAll(async function () {
            await from.relationships.requestReactivation(relationshipId);
            await TestUtil.syncUntilHasRelationships(to);
        });

        test("reactivation revocation should fail when the wrong side revokes it", async function () {
            await expect(to.relationships.revokeReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
        });

        test("reactivation acceptance should fail when the wrong side accepts it", async function () {
            await expect(from.relationships.acceptReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
        });

        test("reactivation rejection should fail when the wrong side rejects it", async function () {
            await expect(from.relationships.rejectReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
        });

        test("requesting reactivation twice should fail", async function () {
            await expect(from.relationships.requestReactivation(relationshipId)).rejects.toThrow(
                "error.transport.relationships.reactivationAlreadyRequested: 'You have already requested the reactivation"
            );

            await expect(to.relationships.requestReactivation(relationshipId)).rejects.toThrow(
                "error.transport.relationships.reactivationAlreadyRequested: 'Your peer has already requested the reactivation"
            );
        });
    });
});

describe("RelationshipTest: operation executioner validation (on pending relationship)", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];

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

        const templateTo = await to.relationshipTemplates.loadPeerRelationshipTemplateByTokenContent(receivedToken.cache!.content);
        const request = await to.relationships.sendRelationship({
            template: templateTo,
            creationContent: {
                mycontent: "request"
            }
        });
        relationshipId = request.id;
        await TestUtil.syncUntilHasRelationships(from);
    });

    afterAll(async function () {
        await from.close();
        await to.close();

        await connection.close();
    });

    test("you should not accept your own relationship", async function () {
        await expect(to.relationships.accept(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
    });

    test("you should not reject your own relationship", async function () {
        await expect(to.relationships.reject(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
    });

    test("you should not revoke your peer's relationship", async function () {
        await expect(from.relationships.revoke(relationshipId)).rejects.toThrow("error.transport.relationships.operationOnlyAllowedForPeer");
    });
});

describe("RelationshipTest: relationship status validation (on active relationship)", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let from: AccountController;
    let to: AccountController;
    let relationshipId: CoreId;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        from = accounts[0];
        to = accounts[1];
        relationshipId = (await TestUtil.addRelationship(from, to)).acceptedRelationshipFromSelf.id;
    });

    afterAll(async function () {
        await from.close();
        await to.close();
        await connection.close();
    });

    test("should not reactivate a relationship", async function () {
        await expect(from.relationships.requestReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not accept a relationship reactivation", async function () {
        await expect(from.relationships.acceptReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not reject a relationship reactivation", async function () {
        await expect(from.relationships.rejectReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not revoke a relationship reactivation", async function () {
        await expect(from.relationships.revokeReactivation(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not decompose a relationship", async function () {
        await expect(from.relationships.decompose(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not accept a relationship", async function () {
        await expect(from.relationships.accept(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not reject a relationship", async function () {
        await expect(from.relationships.reject(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not revoke a relationship", async function () {
        await expect(from.relationships.revoke(relationshipId)).rejects.toThrow("error.transport.relationships.wrongRelationshipStatus");
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
