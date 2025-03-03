import { ApplicationError, Result, sleep } from "@js-soft/ts-utils";
import { AcceptReadAttributeRequestItemParametersJSON } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    ReadAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    RelationshipCreationContent,
    RelationshipCreationContentJSON,
    RelationshipTemplateContent,
    RelationshipTemplateContentJSON,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { IdentityDeletionProcessStatus, Random } from "@nmshd/transport";
import assert from "assert";
import { DateTime } from "luxon";
import {
    GetRelationshipsQuery,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    LocalRequestStatus,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RelationshipAuditLogEntryReason,
    RelationshipChangedEvent,
    RelationshipDTO,
    RelationshipDecomposedBySelfEvent,
    RelationshipReactivationCompletedEvent,
    RelationshipReactivationRequestedEvent,
    RelationshipStatus
} from "../../src";
import {
    QueryParamConditions,
    RuntimeServiceProvider,
    TestRuntimeServices,
    emptyRelationshipCreationContent,
    ensureActiveRelationship,
    establishRelationship,
    exchangeMessageWithRequest,
    exchangeTemplate,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    generateAddressPseudonym,
    getRelationship,
    sendAndReceiveNotification,
    sendMessageToMultipleRecipients,
    syncUntilHasMessageWithNotification,
    syncUntilHasRelationships
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;
let services4: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(3, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
    const runtimeServicesWithDisabledRequestModule = await serviceProvider.launch(1, { enableRequestModule: false, enableDeciderModule: true, enableNotificationModule: true });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];
    services4 = runtimeServicesWithDisabledRequestModule[0];
}, 30000);

afterEach(async () => {
    const activeIdentityDeletionProcess = await services3.transport.identityDeletionProcesses.getActiveIdentityDeletionProcess();

    if (!activeIdentityDeletionProcess.isSuccess) {
        return;
    }

    let abortResult;
    if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
        abortResult = await services3.transport.identityDeletionProcesses.cancelIdentityDeletionProcess();
        if (abortResult.isError) throw abortResult.error;
    }
});

afterAll(() => serviceProvider.stop());

describe("Can Create / Create Relationship", () => {
    let relationshipId: string;

    describe("tests on creationContent of Relationship", () => {
        let invalidRelationshipCreationContent: RelationshipCreationContentJSON;
        let relationshipTemplateContent: RelationshipTemplateContentJSON;

        beforeAll(() => {
            invalidRelationshipCreationContent = RelationshipCreationContent.from({
                response: {
                    "@type": "Response",
                    result: ResponseResult.Accepted,
                    requestId: "aRequestId",
                    items: [
                        ReadAttributeAcceptResponseItem.from({
                            result: ResponseItemResult.Accepted,
                            attributeId: CoreId.from("anAttributeId"),
                            attribute: IdentityAttribute.from({
                                owner: CoreAddress.from(services4.address),
                                value: GivenName.from("aGivenName")
                            })
                        }).toJSON()
                    ]
                }
            }).toJSON();

            relationshipTemplateContent = RelationshipTemplateContent.from({
                onNewRelationship: {
                    "@type": "Request",
                    items: [
                        ReadAttributeRequestItem.from({
                            mustBeAccepted: true,
                            query: {
                                "@type": "IdentityAttributeQuery",
                                valueType: "GivenName"
                            }
                        })
                    ]
                }
            }).toJSON();
        }, 30000);

        test("should not create a Relationship with a false creationContent type", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport)).id;

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: {}
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
            );
            expect(canCreateRelationshipResponse.code).toBe("error.runtime.validation.invalidPropertyValue");

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: {}
            });
            expect(createRelationshipResponse).toBeAnError(
                "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent.",
                "error.runtime.validation.invalidPropertyValue"
            );
        });

        test("should not create a Relationship with a RelationshipCreationContent if an ArbitraryRelationshipTemplateContent is used", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport)).id;

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: invalidRelationshipCreationContent
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the RelationshipTemplate is an ArbitraryRelationshipTemplateContent."
            );
            expect(canCreateRelationshipResponse.code).toBe("error.runtime.validation.invalidPropertyValue");

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: invalidRelationshipCreationContent
            });
            expect(createRelationshipResponse).toBeAnError(
                "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the RelationshipTemplate is an ArbitraryRelationshipTemplateContent.",
                "error.runtime.validation.invalidPropertyValue"
            );
        });

        test("should not create a Relationship with an ArbitraryRelationshipCreationContent if a RelationshipTemplateContent is used", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport, relationshipTemplateContent)).id;

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: emptyRelationshipCreationContent
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the RelationshipTemplate is a RelationshipTemplateContent."
            );
            expect(canCreateRelationshipResponse.code).toBe("error.runtime.validation.invalidPropertyValue");

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: emptyRelationshipCreationContent
            });
            expect(createRelationshipResponse).toBeAnError(
                "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the RelationshipTemplate is a RelationshipTemplateContent.",
                "error.runtime.validation.invalidPropertyValue"
            );
        });

        test("should not create a Relationship if the Request of the RelationshipTemplateContent is not accepted", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport, relationshipTemplateContent)).id;

            const receivedRequest = (
                await services4.consumption.incomingRequests.received({
                    receivedRequest: relationshipTemplateContent.onNewRelationship,
                    requestSourceId: templateId
                })
            ).value;

            await services4.consumption.incomingRequests.checkPrerequisites({
                requestId: receivedRequest.id
            });

            await services4.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            await services4.eventBus.waitForRunningEventHandlers();

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: invalidRelationshipCreationContent
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                "There is no accepted incoming Request associated with the RelationshipTemplateContent of the RelationshipTemplate."
            );
            expect(canCreateRelationshipResponse.code).toBe("error.runtime.relationships.noAcceptedIncomingRequest");

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: invalidRelationshipCreationContent
            });
            expect(createRelationshipResponse).toBeAnError(
                "There is no accepted incoming Request associated with the RelationshipTemplateContent of the RelationshipTemplate.",
                "error.runtime.relationships.noAcceptedIncomingRequest"
            );
        });

        test("should not create a Relationship if the Response of the accepted Request of the RelationshipTemplateContent is not provided with the creationContent", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport, relationshipTemplateContent)).id;

            const receivedRequest = (
                await services4.consumption.incomingRequests.received({
                    receivedRequest: relationshipTemplateContent.onNewRelationship,
                    requestSourceId: templateId
                })
            ).value;

            const checkedRequest = (
                await services4.consumption.incomingRequests.checkPrerequisites({
                    requestId: receivedRequest.id
                })
            ).value;

            await services4.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            await services4.eventBus.waitForRunningEventHandlers();

            await services4.consumption.incomingRequests.accept({
                requestId: checkedRequest.id,
                items: [
                    {
                        accept: true,
                        newAttribute: IdentityAttribute.from({
                            owner: CoreAddress.from(services4.address),
                            value: GivenName.from("aGivenName")
                        }).toJSON()
                    } as AcceptReadAttributeRequestItemParametersJSON
                ]
            });

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: invalidRelationshipCreationContent
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                "The Response of the accepted incoming Request associated with the RelationshipTemplateContent must be provided as the response of the RelationshipCreationContent."
            );
            expect(canCreateRelationshipResponse.code).toBe("error.runtime.relationships.wrongResponseProvidedAsCreationContent");

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: invalidRelationshipCreationContent
            });
            expect(createRelationshipResponse).toBeAnError(
                "The Response of the accepted incoming Request associated with the RelationshipTemplateContent must be provided as the response of the RelationshipCreationContent.",
                "error.runtime.relationships.wrongResponseProvidedAsCreationContent"
            );
        });

        test("can create a Relationship if the Response of the accepted Request of the RelationshipTemplateContent is provided with the creationContent", async () => {
            const templateId = (await exchangeTemplate(services3.transport, services4.transport, relationshipTemplateContent)).id;

            const receivedRequest = (
                await services4.consumption.incomingRequests.received({
                    receivedRequest: relationshipTemplateContent.onNewRelationship,
                    requestSourceId: templateId
                })
            ).value;

            const checkedRequest = (
                await services4.consumption.incomingRequests.checkPrerequisites({
                    requestId: receivedRequest.id
                })
            ).value;

            await services4.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            await services4.eventBus.waitForRunningEventHandlers();

            const acceptedRequest = (
                await services4.consumption.incomingRequests.accept({
                    requestId: checkedRequest.id,
                    items: [
                        {
                            accept: true,
                            newAttribute: IdentityAttribute.from({
                                owner: CoreAddress.from(services4.address),
                                value: GivenName.from("aNewGivenName")
                            }).toJSON()
                        } as AcceptReadAttributeRequestItemParametersJSON
                    ]
                })
            ).value;

            const canCreateRelationshipResponse = (
                await services4.transport.relationships.canCreateRelationship({
                    templateId: templateId,
                    creationContent: RelationshipCreationContent.from({ response: acceptedRequest.response!.content }).toJSON()
                })
            ).value;

            expect(canCreateRelationshipResponse.isSuccess).toBe(true);

            const createRelationshipResponse = await services4.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: RelationshipCreationContent.from({ response: acceptedRequest.response!.content }).toJSON()
            });
            expect(createRelationshipResponse).toBeSuccessful();
        });
    });

    test("should not create Relationship if RelationshipTemplate is already expired", async () => {
        const templateContent: RelationshipTemplateContentJSON = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "ReadAttributeRequestItem",
                        mustBeAccepted: true,
                        query: {
                            "@type": "IdentityAttributeQuery",
                            valueType: "GivenName"
                        }
                    } as ReadAttributeRequestItemJSON
                ]
            }
        };
        const templateId = (await exchangeTemplate(services1.transport, services2.transport, templateContent, DateTime.utc().plus({ seconds: 3 }))).id;

        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        await services2.eventBus.waitForRunningEventHandlers();

        const requests = (await services2.consumption.incomingRequests.getRequests({ query: { "source.reference": templateId } })).value;
        const incomingRequest = requests[0];
        expect([LocalRequestStatus.DecisionRequired, LocalRequestStatus.ManualDecisionRequired]).toContain(incomingRequest.status);

        await sleep(3000);

        const canCreateRelationshipResponse = (
            await services2.transport.relationships.canCreateRelationship({
                templateId: templateId
            })
        ).value;

        assert(!canCreateRelationshipResponse.isSuccess);

        expect(canCreateRelationshipResponse.isSuccess).toBe(false);
        expect(canCreateRelationshipResponse.message).toBe(`The RelationshipTemplate '${templateId}' is already expired and therefore cannot be used to create a Relationship.`);
        expect(canCreateRelationshipResponse.code).toBe("error.transport.relationships.relationshipTemplateIsExpired");

        const expiredRequest = (await services2.consumption.incomingRequests.getRequest({ id: incomingRequest.id })).value;
        expect(expiredRequest.status).toBe(LocalRequestStatus.Expired);

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });

        expect(createRelationshipResponse).toBeAnError(
            `The RelationshipTemplate '${templateId}' is already expired and therefore cannot be used to create a Relationship.`,
            "error.transport.relationships.relationshipTemplateIsExpired"
        );
    });

    test("should not create Relationship if templator has active IdentityDeletionProcess", async () => {
        const templateId = (await exchangeTemplate(services3.transport, services2.transport)).id;
        await services3.transport.identityDeletionProcesses.initiateIdentityDeletionProcess();

        const canCreateRelationshipResponse = (
            await services2.transport.relationships.canCreateRelationship({
                templateId: templateId
            })
        ).value;

        assert(!canCreateRelationshipResponse.isSuccess);

        expect(canCreateRelationshipResponse.isSuccess).toBe(false);
        expect(canCreateRelationshipResponse.message).toBe(
            "The Identity that created the RelationshipTemplate is currently in the process of deleting itself. Thus, it is not possible to establish a Relationship to it."
        );
        expect(canCreateRelationshipResponse.code).toBe("error.transport.relationships.activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate");

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });

        expect(createRelationshipResponse).toBeAnError(
            "The Identity that created the RelationshipTemplate is currently in the process of deleting itself. Thus, it is not possible to establish a Relationship to it.",
            "error.transport.relationships.activeIdentityDeletionProcessOfOwnerOfRelationshipTemplate"
        );
    });

    test("create pending relationship", async () => {
        const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;

        const canCreateRelationshipResponse = (
            await services2.transport.relationships.canCreateRelationship({
                templateId: templateId,
                creationContent: emptyRelationshipCreationContent
            })
        ).value;
        expect(canCreateRelationshipResponse.isSuccess).toBe(true);

        const createRelationshipResponse = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });
        expect(createRelationshipResponse).toBeSuccessful();

        const relationships1 = await syncUntilHasRelationships(services1.transport);
        expect(relationships1).toHaveLength(1);
        relationshipId = relationships1[0].id;
    });

    describe("tests on pending relationship", () => {
        test("should not be able to create a new relationship if a pending relationship already exists", async () => {
            const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;

            const canCreateRelationshipResponse = (
                await services2.transport.relationships.canCreateRelationship({
                    templateId: templateId
                })
            ).value;

            assert(!canCreateRelationshipResponse.isSuccess);

            expect(canCreateRelationshipResponse.isSuccess).toBe(false);
            expect(canCreateRelationshipResponse.message).toBe(
                `No new Relationship to the peer can be created as a Relationship in status '${RelationshipStatus.Pending}' currently exists.`
            );
            expect(canCreateRelationshipResponse.code).toBe("error.transport.relationships.relationshipCurrentlyExists");

            const result = await services2.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: emptyRelationshipCreationContent
            });

            expect(result).toBeAnError(
                `No new Relationship to the peer can be created as a Relationship in status '${RelationshipStatus.Pending}' currently exists.`,
                "error.transport.relationships.relationshipCurrentlyExists"
            );
        });

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

    test("should not be able to create a new relationship if an active relationship already exists", async () => {
        const templateId = (await exchangeTemplate(services2.transport, services1.transport)).id;

        const result = await services1.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });

        expect(result).toBeAnError(
            `No new Relationship to the peer can be created as a Relationship in status '${RelationshipStatus.Active}' currently exists.`,
            "error.transport.relationships.relationshipCurrentlyExists"
        );
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

describe("Relationships query", () => {
    test("query own relationship", async () => {
        await ensureActiveRelationship(services1.transport, services2.transport);
        const relationship = await getRelationship(services1.transport);
        const conditions = new QueryParamConditions<GetRelationshipsQuery>(relationship, services1.transport)
            .addStringSet("peer")
            .addStringSet("status")
            .addStringSet("templateId");
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

    test("should not send a message whose content is not a notification", async () => {
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
        expect(result).toBeAnError(/.*/, "error.runtime.messages.hasNoActiveRelationship");
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
        test("should not be able to create a new relationship if a terminated relationship currently exists", async () => {
            const templateId = (await exchangeTemplate(services2.transport, services1.transport)).id;

            const result = await services1.transport.relationships.createRelationship({
                templateId: templateId,
                creationContent: emptyRelationshipCreationContent
            });

            expect(result).toBeAnError(
                `No new Relationship to the peer can be created as a Relationship in status '${RelationshipStatus.Terminated}' currently exists.`,
                "error.transport.relationships.relationshipCurrentlyExists"
            );
        });

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

    beforeAll(async () => {
        const relationship = await ensureActiveRelationship(services1.transport, services2.transport);
        relationshipId = relationship.id;
        templateId = relationship.templateId;

        await createRelationshipData(services1, services2);

        const runtimeServices = await serviceProvider.launch(1, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
        services3 = runtimeServices[0];
        const relationship2 = await establishRelationship(services1.transport, services3.transport);
        relationshipId2 = relationship2.id;
        templateId2 = relationship2.templateId;

        await createRelationshipData(services1, services3);
        multipleRecipientsMessageId = (await sendMessageToMultipleRecipients(services1.transport, [services2.address, services3.address])).value.id;

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await services2.eventBus.waitForEvent(RelationshipChangedEvent);

        await services1.transport.relationships.terminateRelationship({ relationshipId: relationshipId2 });
    });

    test("relationship should be decomposed", async () => {
        await expect(services1.eventBus).toHavePublished(RelationshipDecomposedBySelfEvent, (e) => e.data.relationshipId === relationshipId);

        const ownRelationship = await services1.transport.relationships.getRelationship({ id: relationshipId });
        expect(ownRelationship).toBeAnError(/.*/, "error.runtime.recordNotFound");

        const peerRelationship = (await syncUntilHasRelationships(services2.transport))[0];
        expect(peerRelationship.status).toBe(RelationshipStatus.DeletionProposed);
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

        const addressPseudonym = (await generateAddressPseudonym(process.env.NMSHD_TEST_BASEURL!)).toString();
        const anonymizedMessages = (await services1.transport.messages.getMessages({ query: { "recipients.address": addressPseudonym } })).value;
        expect(anonymizedMessages).toHaveLength(1);

        const anonymizedMessage = anonymizedMessages[0];
        expect(anonymizedMessage.id).toBe(multipleRecipientsMessageId);
        expect(anonymizedMessage.recipients.map((r) => r.address)).toStrictEqual([addressPseudonym, services3.address]);
    });

    test("messages with multiple recipients should be deleted if all its relationships are decomposed", async () => {
        await services1.transport.relationships.decomposeRelationship({ relationshipId: relationshipId2 });
        const messages = (await services1.transport.messages.getMessages({})).value;
        expect(messages).toHaveLength(0);
    });

    test("should not be able to create a new relationship if a relationship whose deletion is proposed currently exists", async () => {
        const templateId = (await exchangeTemplate(services1.transport, services2.transport)).id;

        const result = await services2.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });

        expect(result).toBeAnError(
            `No new Relationship to the peer can be created as a Relationship in status '${RelationshipStatus.DeletionProposed}' currently exists.`,
            "error.transport.relationships.relationshipCurrentlyExists"
        );
    });

    test("no new relationship can be created if former relationship is not yet mutually decomposed", async () => {
        const templateId = (await exchangeTemplate(services2.transport, services1.transport)).id;

        const canCreateRelationshipResponse = (
            await services1.transport.relationships.canCreateRelationship({
                templateId: templateId
            })
        ).value;

        assert(!canCreateRelationshipResponse.isSuccess);

        expect(canCreateRelationshipResponse.isSuccess).toBe(false);
        expect(canCreateRelationshipResponse.message).toBe("No new Relationship can be created as the former Relationship is not yet decomposed by the peer.");
        expect(canCreateRelationshipResponse.code).toBe("error.transport.relationships.relationshipNotYetDecomposedByPeer");

        const result = await services1.transport.relationships.createRelationship({
            templateId: templateId,
            creationContent: emptyRelationshipCreationContent
        });

        expect(result).toBeAnError(
            "No new Relationship can be created as the former Relationship is not yet decomposed by the peer.",
            "error.transport.relationships.relationshipNotYetDecomposedByPeer"
        );
    });

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

        const randomName1 = await Random.string(7);
        await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: randomName1
                }
            }
        });

        const randomName2 = await Random.string(7);
        await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: randomName2
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
