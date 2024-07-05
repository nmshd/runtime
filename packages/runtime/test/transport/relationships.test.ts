import { ApplicationError, Result } from "@js-soft/ts-utils";
import { RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { IdentityUtil } from "@nmshd/transport";
import {
    GetRelationshipsQuery,
    IncomingRequestReceivedEvent,
    LocalAttributeDTO,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipAuditLogEntryReason,
    RelationshipChangedEvent,
    RelationshipDTO,
    RelationshipReactivationCompletedEvent,
    RelationshipReactivationRequestedEvent,
    RelationshipStatus
} from "../../src";
import { RelationshipDecomposedBySelfEvent } from "../../src/events/transport/RelationshipDecomposedBySelfEvent";
import {
    QueryParamConditions,
    RuntimeServiceProvider,
    TestRuntimeServices,
    createTemplate,
    ensureActiveRelationship,
    establishRelationship,
    exchangeMessageWithRequest,
    exchangeTemplate,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    getRelationship,
    sendAndReceiveNotification,
    sendMessageToMultipleRecipients,
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
    let relationshipId: string;

    test("load relationship Template in connector 2", async () => {
        const template = await createTemplate(services1.transport);

        const response = await services2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
        expect(response).toBeSuccessful();
    });

    test("create pending relationship", async () => {
        const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: { a: "b" }
        });
        expect(createRelationshipResponse).toBeSuccessful();

        const relationships1 = await syncUntilHasRelationships(services1.transport);
        expect(relationships1).toHaveLength(1);
        relationshipId = relationships1[0].id;
    });

    describe("tests on pending relationship", () => {
        test("should not accept relationship sent by yourself", async () => {
            expect(await services2.transport.relationships.acceptRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.operationOnlyAllowedForPeer");
        });
        test("should not reject relationship sent by yourself", async () => {
            expect(await services2.transport.relationships.rejectRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.operationOnlyAllowedForPeer");
        });
        test("should not revoke relationship sent by yourself", async () => {
            expect(await services1.transport.relationships.revokeRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.operationOnlyAllowedForPeer");
        });

        test("execute further relationship creation flow", async () => {
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
});

describe("Relationship status validations on active relationship", () => {
    let relationshipId: string;
    beforeAll(async () => {
        await ensureActiveRelationship(services1.transport, services2.transport);
        const relationship = await getRelationship(services1.transport);
        relationshipId = relationship.id;
    });

    test("should not request a relationship reactivation", async () => {
        expect(await services1.transport.relationships.requestRelationshipReactivation({ relationshipId })).toBeAnError(
            /.*/,
            "error.transport.relationships.wrongRelationshipStatus"
        );
    });

    test("should not accept a relationship reactivation", async () => {
        expect(await services1.transport.relationships.acceptRelationshipReactivation({ relationshipId })).toBeAnError(
            /.*/,
            "error.transport.relationships.wrongRelationshipStatus"
        );
    });

    test("should not reject a relationship reactivation", async () => {
        expect(await services1.transport.relationships.rejectRelationshipReactivation({ relationshipId })).toBeAnError(
            /.*/,
            "error.transport.relationships.wrongRelationshipStatus"
        );
    });

    test("should not revoke a relationship reactivation", async () => {
        expect(await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId })).toBeAnError(
            /.*/,
            "error.transport.relationships.wrongRelationshipStatus"
        );
    });

    test("should not accept a relationship", async () => {
        expect(await services1.transport.relationships.acceptRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not reject a relationship", async () => {
        expect(await services1.transport.relationships.rejectRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not revoke a relationship", async () => {
        expect(await services1.transport.relationships.rejectRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.wrongRelationshipStatus");
    });

    test("should not decompose a relationship", async () => {
        expect(await services1.transport.relationships.decomposeRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.wrongRelationshipStatus");
    });
});

describe("Templator with active IdentityDeletionProcess", () => {
    const serviceProvider = new RuntimeServiceProvider();
    let services1: TestRuntimeServices;
    let services2: TestRuntimeServices;

    beforeAll(async () => {
        const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
        services1 = runtimeServices[0];
        services2 = runtimeServices[1];
    }, 30000);

    afterAll(() => serviceProvider.stop());

    test("returns error if templator has active IdentityDeletionProcess", async () => {
        const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;
        await services1.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: { a: "b" }
        });
        expect(createRelationshipResponse).toBeAnError(
            "The Identity who created the RelationshipTemplate is currently in the process of deleting itself. Thus, it is not possible to establish a Relationship to it.",
            "error.transport.relationships.activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate"
        );
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
        expect(terminationResult.value.status).toBe(RelationshipStatus.Terminated);

        const syncedRelationship = (await syncUntilHasRelationships(services2.transport))[0];
        expect(syncedRelationship.status).toBe(RelationshipStatus.Terminated);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.Termination
        );
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

    describe("Validating relationship operations on terminated relationship", () => {
        test("should not terminate a relationship in status terminated again", async () => {
            expect(await services1.transport.relationships.terminateRelationship({ relationshipId })).toBeAnError(/.*/, "error.transport.relationships.wrongRelationshipStatus");
        });

        test("reactivation acceptance should fail without reactivation request", async () => {
            expect(await services1.transport.relationships.acceptRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.reactivationNotRequested"
            );
        });

        test("reactivation revocation should fail without reactivation request", async () => {
            expect(await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.reactivationNotRequested"
            );
        });

        test("reactivation rejection should fail without reactivation request", async () => {
            expect(await services1.transport.relationships.rejectRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.reactivationNotRequested"
            );
        });
    });

    describe("Validating relationship operations on terminated relationship with requested reactivation", () => {
        beforeAll(async () => {
            await services1.transport.relationships.requestRelationshipReactivation({ relationshipId });
            await syncUntilHasRelationships(services2.transport);
        });

        afterAll(async () => {
            await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId });
            await syncUntilHasRelationships(services2.transport);
        });

        test("reactivation acceptance should fail when the wrong side accepts it", async () => {
            expect(await services1.transport.relationships.acceptRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.operationOnlyAllowedForPeer"
            );
        });

        test("reactivation rejection should fail when the wrong side rejects it", async () => {
            expect(await services1.transport.relationships.rejectRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.operationOnlyAllowedForPeer"
            );
        });

        test("reactivation revocation should fail when the wrong side revokes it", async () => {
            expect(await services2.transport.relationships.revokeRelationshipReactivation({ relationshipId })).toBeAnError(
                /.*/,
                "error.transport.relationships.operationOnlyAllowedForPeer"
            );
        });

        test("requesting reactivation twice should fail", async () => {
            expect(await services1.transport.relationships.requestRelationshipReactivation({ relationshipId })).toBeAnError(
                "You have already requested the reactivation",
                "error.transport.relationships.reactivationAlreadyRequested"
            );
            expect(await services2.transport.relationships.requestRelationshipReactivation({ relationshipId })).toBeAnError(
                "Your peer has already requested the reactivation",
                "error.transport.relationships.reactivationAlreadyRequested"
            );
        });
    });

    test("should request the relationship reactivation and then revoke it", async () => {
        const reactivationRequestResult = await services1.transport.relationships.requestRelationshipReactivation({ relationshipId });
        expect(reactivationRequestResult).toBeSuccessful();
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        await expect(services1.eventBus).toHavePublished(
            RelationshipReactivationRequestedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );

        const revocationResult = await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId });
        expect(revocationResult).toBeSuccessful();
        expect(revocationResult.value.status).toBe(RelationshipStatus.Terminated);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );
        await expect(services1.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );

        const relationship2 = (await syncUntilHasRelationships(services2.transport))[0];
        expect(relationship2.status).toBe(RelationshipStatus.Terminated);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );
        await expect(services2.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RevocationOfReactivation
        );
    });

    test("should get the relationship reactivation request from the peer and reject it", async () => {
        await services1.transport.relationships.requestRelationshipReactivation({ relationshipId });

        await syncUntilHasRelationships(services2.transport);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        await expect(services2.eventBus).toHavePublished(
            RelationshipReactivationRequestedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        const rejectionResult = await services2.transport.relationships.rejectRelationshipReactivation({ relationshipId });
        expect(rejectionResult).toBeSuccessful();
        expect(rejectionResult.value.status).toBe(RelationshipStatus.Terminated);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );
        await expect(services2.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );

        const relationship1 = (await syncUntilHasRelationships(services1.transport))[0];
        expect(relationship1.status).toBe(RelationshipStatus.Terminated);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );
        await expect(services1.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.RejectionOfReactivation
        );
    });

    test("should get the relationship reactivation request from the peer and accept it", async () => {
        await services1.transport.relationships.requestRelationshipReactivation({ relationshipId });

        await syncUntilHasRelationships(services2.transport);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        await expect(services2.eventBus).toHavePublished(
            RelationshipReactivationRequestedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.ReactivationRequested
        );
        const acceptanceResult = await services2.transport.relationships.acceptRelationshipReactivation({ relationshipId });
        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.status).toBe(RelationshipStatus.Active);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );
        await expect(services2.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );

        const relationship1 = (await syncUntilHasRelationships(services1.transport))[0];
        expect(relationship1.status).toBe(RelationshipStatus.Active);
        await expect(services1.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );
        await expect(services1.eventBus).toHavePublished(
            RelationshipReactivationCompletedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.AcceptanceOfReactivation
        );
    });
});

describe("RelationshipDecomposition", () => {
    let services3: TestRuntimeServices;
    let relationshipId: string;
    let templateId: string;
    let relationshipId2: string;
    let templateId2: string;
    let multipleRecipientsMessageId: string;

    let decompositionResult: Result<null, ApplicationError>;
    beforeAll(async () => {
        const relationship = await ensureActiveRelationship(services1.transport, services2.transport);
        relationshipId = relationship.id;
        templateId = relationship.template.id;

        await createRelationshipData(services1, services2);

        const runtimeServices = await serviceProvider.launch(1, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
        services3 = runtimeServices[0];
        const relationship2 = await establishRelationship(services1.transport, services3.transport);
        relationshipId2 = relationship2.id;
        templateId2 = relationship2.template.id;

        await createRelationshipData(services1, services3);
        multipleRecipientsMessageId = (await sendMessageToMultipleRecipients(services1.transport, [services2.address, services3.address])).id;

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        decompositionResult = await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await services2.eventBus.waitForEvent(RelationshipChangedEvent);

        await services1.transport.relationships.terminateRelationship({ relationshipId: relationshipId2 });
    });

    test("relationship should be decomposed", async () => {
        expect(decompositionResult).toBeSuccessful();
        await expect(services1.eventBus).toHavePublished(RelationshipDecomposedBySelfEvent, (e) => e.data === relationshipId);

        const ownRelationship = await services1.transport.relationships.getRelationship({ id: relationshipId });
        expect(ownRelationship).toBeAnError(/.*/, "error.runtime.recordNotFound");

        const peerRelationship = (await syncUntilHasRelationships(services2.transport))[0];
        expect(peerRelationship.status).toBe(RelationshipStatus.DecomposedByPeer);
        await expect(services2.eventBus).toHavePublished(
            RelationshipChangedEvent,
            (e) => e.data.id === relationshipId && e.data.auditLog[e.data.auditLog.length - 1].reason === RelationshipAuditLogEntryReason.Decomposition
        );
    });

    test("relationship template should be deleted", async () => {
        const result = await services1.transport.relationshipTemplates.getRelationshipTemplate({ id: templateId });
        expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");

        const resultControl = await services1.transport.relationshipTemplates.getRelationshipTemplate({ id: templateId2 });
        expect(resultControl).toBeSuccessful();
    });

    test("requests should be deleted", async () => {
        const outgoingRequests = (await services1.consumption.outgoingRequests.getRequests({ query: { peer: services2.address } })).value;
        expect(outgoingRequests).toHaveLength(0);

        const incomingRequests = (await services1.consumption.incomingRequests.getRequests({ query: { peer: services2.address } })).value;
        expect(incomingRequests).toHaveLength(0);

        const outgoingRequestsControl = (await services1.consumption.outgoingRequests.getRequests({ query: { peer: services3.address } })).value;
        expect(outgoingRequestsControl).not.toHaveLength(0);

        const incomingRequestsControl = (await services1.consumption.incomingRequests.getRequests({ query: { peer: services3.address } })).value;
        expect(incomingRequestsControl).not.toHaveLength(0);
    });

    test("attributes should be deleted", async () => {
        const ownSharedAttributes = (await services1.consumption.attributes.getOwnSharedAttributes({ peer: services2.address })).value;
        expect(ownSharedAttributes).toHaveLength(0);

        const peerSharedAttributes = (await services1.consumption.attributes.getPeerSharedAttributes({ peer: services2.address })).value;
        expect(peerSharedAttributes).toHaveLength(0);

        const ownSharedAttributesControl = (await services1.consumption.attributes.getOwnSharedAttributes({ peer: services3.address })).value;
        expect(ownSharedAttributesControl).not.toHaveLength(0);

        const peerSharedAttributesControl = (await services1.consumption.attributes.getPeerSharedAttributes({ peer: services3.address })).value;
        expect(peerSharedAttributesControl).not.toHaveLength(0);
    });

    test("notifications should be deleted", async () => {
        const notifications = (await services1.consumption.notifications.getNotifications({ query: { peer: services2.address } })).value;
        expect(notifications).toHaveLength(0);

        const notificationsControl = (await services1.consumption.notifications.getNotifications({ query: { peer: services3.address } })).value;
        expect(notificationsControl).not.toHaveLength(0);
    });

    test("messages should be deleted/anonymized", async () => {
        const messagesToPeer = (await services1.transport.messages.getMessages({ query: { "recipients.address": services2.address } })).value;
        expect(messagesToPeer).toHaveLength(0);

        const messagesFromPeer = (await services1.transport.messages.getMessages({ query: { createdBy: services2.address } })).value;
        expect(messagesFromPeer).toHaveLength(0);

        const messagesToControlPeer = (await services1.transport.messages.getMessages({ query: { "recipients.address": services3.address } })).value;
        expect(messagesToControlPeer).not.toHaveLength(0);

        const messagesFromControlPeer = (await services1.transport.messages.getMessages({ query: { createdBy: services3.address } })).value;
        expect(messagesFromControlPeer).not.toHaveLength(0);

        const addressPseudonym = (await getAddressPseudonym()).toString();
        const anonymizedMessages = (await services1.transport.messages.getMessages({ query: { "recipients.address": addressPseudonym } })).value;
        expect(anonymizedMessages).toHaveLength(1);
        const anonymizedMessage = anonymizedMessages[0];
        expect(anonymizedMessage.id).toBe(multipleRecipientsMessageId);
        expect(anonymizedMessage.recipients).toBe([services3.address, addressPseudonym]);
    });

    test("messages with multiple recipients should be deleted if all its relationships are decomposed", async () => {
        await services1.transport.relationships.decomposeRelationship({ relationshipId: relationshipId2 });
        const messages = (await services1.transport.messages.getMessages({})).value;
        expect(messages).toHaveLength(0);
    });

    async function getAddressPseudonym() {
        const pseudoPublicKey = CoreBuffer.fromUtf8("deleted identity");
        return await IdentityUtil.createAddress({ algorithm: 1, publicKey: pseudoPublicKey }, "prod.enmeshed.eu");
    }

    async function createRelationshipData(services1: TestRuntimeServices, services2: TestRuntimeServices) {
        const requestContent = {
            content: {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    }
                ]
            }
        };
        await exchangeMessageWithRequest(services1, services2, { ...requestContent, peer: services2.address });
        await exchangeMessageWithRequest(services2, services1, { ...requestContent, peer: services1.address });

        await sendAndReceiveNotification(services1.transport, services2.transport, services2.consumption);

        await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Own name"
                }
            }
        });

        await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Own name"
                }
            }
        });
    }
});

describe("Relationship existence check", () => {
    const fakeRelationshipId = "REL00000000000000000";

    test("should not accept a relationship", async function () {
        expect(await services1.transport.relationships.acceptRelationship({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not reject a relationship", async function () {
        expect(await services1.transport.relationships.rejectRelationship({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not revoke a relationship", async function () {
        expect(await services1.transport.relationships.revokeRelationship({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not terminate a relationship", async function () {
        expect(await services1.transport.relationships.terminateRelationship({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not request a relationship reactivation", async function () {
        expect(await services1.transport.relationships.requestRelationshipReactivation({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not accept a relationship reactivation", async function () {
        expect(await services1.transport.relationships.acceptRelationshipReactivation({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not reject a relationship reactivation", async function () {
        expect(await services1.transport.relationships.rejectRelationshipReactivation({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not revoke a relationship reactivation", async function () {
        expect(await services1.transport.relationships.revokeRelationshipReactivation({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should not decompose a relationship", async function () {
        expect(await services1.transport.relationships.decomposeRelationship({ relationshipId: fakeRelationshipId })).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });
});
