import { ApplicationError, Result } from "@js-soft/ts-utils";
import { RelationshipAttributeConfidentiality } from "@nmshd/content";
import {
    GetRelationshipsQuery,
    IncomingRequestReceivedEvent,
    LocalAttributeDTO,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipAuditLogEntryReason,
    RelationshipChangedEvent,
    RelationshipDTO,
    RelationshipStatus
} from "../../src";
import {
    QueryParamConditions,
    RuntimeServiceProvider,
    TestRuntimeServices,
    createTemplate,
    ensureActiveRelationship,
    exchangeMessageWithRequest,
    exchangeTemplate,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    getRelationship,
    syncUntilHasMessageWithNotification,
    syncUntilHasRelationships
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Create Relationship", () => {
    test("load relationship Template in connector 2", async () => {
        const template = await createTemplate(services1.transport);

        const response = await services2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
        expect(response).toBeSuccessful();
    });

    test("execute relationship creation flow", async () => {
        const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: { a: "b" }
        });
        expect(createRelationshipResponse).toBeSuccessful();

        const relationships1 = await syncUntilHasRelationships(services1.transport);
        expect(relationships1).toHaveLength(1);
        const relationshipId = relationships1[0].id;

        const acceptRelationshipResponse = await services1.transport.relationships.acceptRelationship({
            relationshipId
        });
        expect(acceptRelationshipResponse).toBeSuccessful();

        const relationships1Response = await services1.transport.relationships.getRelationships({});
        expect(relationships1Response).toBeSuccessful();
        expect(relationships1Response.value).toHaveLength(1);

        const relationships2 = await syncUntilHasRelationships(services2.transport);
        expect(relationships2).toHaveLength(1);

        const relationships2Response = await services2.transport.relationships.getRelationships({});
        expect(relationships2Response).toBeSuccessful();
        expect(relationships2Response.value).toHaveLength(1);

        const relationship1Response = await services1.transport.relationships.getRelationship({ id: relationshipId });
        expect(relationship1Response).toBeSuccessful();
        expect(relationship1Response.value.status).toBe("Active");

        const relationship2Response = await services2.transport.relationships.getRelationship({ id: relationshipId });
        expect(relationship2Response).toBeSuccessful();
        expect(relationship2Response.value.status).toBe("Active");
    });
});

describe("Relationships query", () => {
    test("query own relationship", async () => {
        await ensureActiveRelationship(services1.transport, services2.transport);
        const relationship = await getRelationship(services1.transport);
        const conditions = new QueryParamConditions<GetRelationshipsQuery>(relationship, services1.transport)
            .addStringSet("peer")
            .addStringSet("status")
            .addStringSet("template.id");
        await conditions.executeTests((c, q) => c.relationships.getRelationships({ query: q }));
    });
});

describe("Attributes for the relationship", () => {
    let relationshipId: string;
    let ownSharedIdentityAttributeV0: LocalAttributeDTO;
    let ownSharedIdentityAttributeV1: LocalAttributeDTO;
    let peerSharedIdentityAttributeV0: LocalAttributeDTO;
    let peerSharedIdentityAttributeV1: LocalAttributeDTO;
    let ownSharedRelationshipAttributeV0: LocalAttributeDTO;
    let ownSharedRelationshipAttributeV1: LocalAttributeDTO;
    let peerSharedRelationshipAttributeV0: LocalAttributeDTO;
    let peerSharedRelationshipAttributeV1: LocalAttributeDTO;
    beforeAll(async () => {
        await ensureActiveRelationship(services1.transport, services2.transport);

        const relationship = await getRelationship(services1.transport);
        relationshipId = relationship.id;

        // create own shared attributes
        ownSharedIdentityAttributeV0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Own name"
                }
            }
        });

        const repositoryAttributeIdV0 = ownSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        ({ predecessor: ownSharedIdentityAttributeV0, successor: ownSharedIdentityAttributeV1 } = await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(
            services1,
            services2,
            {
                predecessorId: repositoryAttributeIdV0,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "New own name"
                    }
                }
            }
        ));

        ownSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "Own string",
                    title: "Own title"
                },
                isTechnical: false
            }
        });

        const ownSucceedRelationshipAttributeAndNotifyPeerResult = (
            await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: ownSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "New own string",
                        title: "New own title"
                    }
                }
            })
        ).value;

        ownSharedRelationshipAttributeV0 = ownSucceedRelationshipAttributeAndNotifyPeerResult["predecessor"];
        ownSharedRelationshipAttributeV1 = ownSucceedRelationshipAttributeAndNotifyPeerResult["successor"];
        const ownNotificationId = ownSucceedRelationshipAttributeAndNotifyPeerResult["notificationId"];

        await syncUntilHasMessageWithNotification(services2.transport, ownNotificationId);

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === ownSharedRelationshipAttributeV1.id;
        });

        // create peer shared attributes
        peerSharedIdentityAttributeV0 = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Peer name"
                }
            }
        });

        const peerRepositoryAttributeIdV0 = peerSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        ({ predecessor: peerSharedIdentityAttributeV0, successor: peerSharedIdentityAttributeV1 } = await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(
            services2,
            services1,
            {
                predecessorId: peerRepositoryAttributeIdV0,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "New peer name"
                    }
                }
            }
        ));

        peerSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "Peer string",
                    title: "Peer title"
                },
                isTechnical: false
            }
        });

        const peerSucceedRelationshipAttributeAndNotifyPeerResult = (
            await services2.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: peerSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "New peer string",
                        title: "New peer title"
                    }
                }
            })
        ).value;

        peerSharedRelationshipAttributeV0 = peerSucceedRelationshipAttributeAndNotifyPeerResult["predecessor"];
        peerSharedRelationshipAttributeV1 = peerSucceedRelationshipAttributeAndNotifyPeerResult["successor"];
        const peerNotificationId = peerSucceedRelationshipAttributeAndNotifyPeerResult["notificationId"];

        await syncUntilHasMessageWithNotification(services1.transport, peerNotificationId);

        await services1.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === peerSharedRelationshipAttributeV1.id;
        });
    });

    test("get only latest version of attributes", async () => {
        const result1 = await services1.transport.relationships.getAttributesForRelationship({ id: relationshipId });
        expect(result1).toBeSuccessful();
        const attributesOfRelationship1 = result1.value;
        const attributesOfRelationshipIds1 = attributesOfRelationship1.map((a) => a.id);
        expect(attributesOfRelationshipIds1.sort()).toStrictEqual(
            [ownSharedIdentityAttributeV1.id, peerSharedIdentityAttributeV1.id, ownSharedRelationshipAttributeV1.id, peerSharedRelationshipAttributeV1.id].sort()
        );

        const result2 = await services2.transport.relationships.getAttributesForRelationship({ id: relationshipId });
        expect(result2).toBeSuccessful();
        const attributesOfRelationship2 = result2.value;
        const attributesOfRelationshipIds2 = attributesOfRelationship2.map((a) => a.id);
        expect(attributesOfRelationshipIds2.sort()).toStrictEqual(
            [ownSharedIdentityAttributeV1.id, peerSharedIdentityAttributeV1.id, ownSharedRelationshipAttributeV1.id, peerSharedRelationshipAttributeV1.id].sort()
        );
    });

    test("get all versions of attributes", async () => {
        const result1 = await services1.transport.relationships.getAttributesForRelationship({
            id: relationshipId,
            onlyLatestVersions: false
        });
        expect(result1).toBeSuccessful();
        const attributesOfRelationship1 = result1.value;
        const attributesOfRelationshipIds1 = attributesOfRelationship1.map((a) => a.id);
        expect(attributesOfRelationshipIds1.sort()).toStrictEqual(
            [
                ownSharedIdentityAttributeV0.id,
                ownSharedIdentityAttributeV1.id,
                peerSharedIdentityAttributeV0.id,
                peerSharedIdentityAttributeV1.id,
                ownSharedRelationshipAttributeV0.id,
                ownSharedRelationshipAttributeV1.id,
                peerSharedRelationshipAttributeV0.id,
                peerSharedRelationshipAttributeV1.id
            ].sort()
        );

        const result2 = await services2.transport.relationships.getAttributesForRelationship({ id: relationshipId, onlyLatestVersions: false });
        expect(result2).toBeSuccessful();
        const attributesOfRelationship2 = result2.value;
        const attributesOfRelationshipIds2 = attributesOfRelationship2.map((a) => a.id);
        expect(attributesOfRelationshipIds2.sort()).toStrictEqual(
            [
                ownSharedIdentityAttributeV0.id,
                ownSharedIdentityAttributeV1.id,
                peerSharedIdentityAttributeV0.id,
                peerSharedIdentityAttributeV1.id,
                ownSharedRelationshipAttributeV0.id,
                ownSharedRelationshipAttributeV1.id,
                peerSharedRelationshipAttributeV0.id,
                peerSharedRelationshipAttributeV1.id
            ].sort()
        );
    });
});

describe("RelationshipTermination", () => {
    let relationshipId: string;
    let terminationResult: Result<RelationshipDTO, ApplicationError>;
    beforeAll(async () => {
        relationshipId = (await ensureActiveRelationship(services1.transport, services2.transport)).id;

        const requestContent = {
            content: {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            },
            peer: services2.address
        };
        await exchangeMessageWithRequest(services1, services2, requestContent);

        terminationResult = await services1.transport.relationships.terminateRelationship({ relationshipId });
    });

    test("relationship status is terminated", async () => {
        expect(terminationResult).toBeSuccessful();
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.Termination
        );
        const result = (await services1.transport.relationships.getRelationship({ id: relationshipId })).value;
        expect(result.status).toBe(RelationshipStatus.Terminated);
    });

    test("should not send a message", async () => {
        const result = await services1.transport.messages.sendMessage({
            recipients: [services2.address],
            content: {
                "@type": "Mail",
                body: "b",
                cc: [],
                subject: "a",
                to: [services2.address]
            }
        });
        expect(result).toBeAnError(/.*/, "error.transport.messages.missingOrInactiveRelationship");
    });

    test("should not decide a request", async () => {
        await syncUntilHasRelationships(services2.transport);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.Termination
        );

        const incomingRequest = (await services2.eventBus.waitForEvent(IncomingRequestReceivedEvent)).data;

        const canAcceptResult = (await services2.consumption.incomingRequests.canAccept({ requestId: incomingRequest.id, items: [{ accept: true }] })).value;
        expect(canAcceptResult.isSuccess).toBe(false);
        expect(canAcceptResult.code).toBe("error.consumption.requests.wrongRelationshipStatus");

        const canRejectResult = (await services2.consumption.incomingRequests.canReject({ requestId: incomingRequest.id, items: [{ accept: false }] })).value;
        expect(canRejectResult.isSuccess).toBe(false);
        expect(canRejectResult.code).toBe("error.consumption.requests.wrongRelationshipStatus");
    });

    test("should not create a request", async () => {
        const requestContent = {
            content: {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            },
            peer: services2.address
        };
        const result = await services1.consumption.outgoingRequests.create(requestContent);
        expect(result).toBeAnError(/.*/, "error.consumption.requests.wrongRelationshipStatus");
    });

    test("should not create a challenge for the relationship", async () => {
        const result = await services1.transport.challenges.createChallenge({
            challengeType: "Relationship",
            relationship: relationshipId
        });
        expect(result).toBeAnError(/.*/, "error.transport.challenges.challengeTypeRequiresActiveRelationship");
    });

    test("should revoke the relationship reactivation", async () => {
        const reactivationRequestResult = await services1.transport.relationships.reactivateRelationship({ relationshipId });
        expect(reactivationRequestResult).toBeSuccessful();
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );

        const revocationResult = await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId });
        expect(revocationResult).toBeSuccessful();
        expect(revocationResult.value.status).toBe(RelationshipStatus.Terminated);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );

        const relationship2 = (await syncUntilHasRelationships(services2.transport))[0];
        expect(relationship2.status).toBe(RelationshipStatus.Terminated);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );

        const reactivationResult = await services2.transport.relationships.acceptRelationshipReactivation({ relationshipId });
        expect(reactivationResult).toBeAnError(/.*/, "error.transport.relationships.reactivationNotRequested");
    });

    test("should reject the relationship reactivation", async () => {
        await services1.transport.relationships.reactivateRelationship({ relationshipId });

        await syncUntilHasRelationships(services2.transport);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        const rejectionResult = await services2.transport.relationships.rejectRelationshipReactivation({ relationshipId });
        expect(rejectionResult).toBeSuccessful();
        expect(rejectionResult.value.status).toBe(RelationshipStatus.Terminated);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );

        const relationship1 = (await syncUntilHasRelationships(services1.transport))[0];
        expect(relationship1.status).toBe(RelationshipStatus.Terminated);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );

        const revocationResult = await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId });
        expect(revocationResult).toBeAnError(/.*/, "error.transport.relationships.reactivationNotRequested");
    });

    test("should accept the relationship reactivation", async () => {
        await services1.transport.relationships.reactivateRelationship({ relationshipId });

        await syncUntilHasRelationships(services2.transport);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        const acceptanceResult = await services2.transport.relationships.acceptRelationshipReactivation({ relationshipId });
        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );

        const relationship1 = (await syncUntilHasRelationships(services1.transport))[0];
        expect(relationship1.status).toBe(RelationshipStatus.Active);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );
    });
});
