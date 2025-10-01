import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AcceptResponseItem,
    DeleteAttributeAcceptResponseItem,
    DeleteAttributeRequestItem,
    IdentityAttribute,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    AcceptDeleteAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    DeleteAttributeRequestItemProcessor,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    LocalRequest,
    LocalRequestStatus,
    OwnIdentityAttribute,
    OwnIdentityAttributeSuccessorParams,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionStatus
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("DeleteAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let processor: DeleteAttributeRequestItemProcessor;

    let peerAddress: CoreAddress;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        ({ accountController, consumptionController } = accounts[0]);

        peerAddress = CoreAddress.from("peerAddress");
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(function () {
        processor = new DeleteAttributeRequestItemProcessor(consumptionController);
    });

    describe("canCreateOutgoingRequestItem", function () {
        test("returns success requesting the deletion of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns success requesting the deletion of an OwnRelationshipAttribute", async function () {
            const sOwnRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error requesting the deletion of an OwnIdentityAttribute that is not forwarded", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already.`
            });
        });

        test("returns an error requesting the deletion of a PeerIdentityAttribute", async function () {
            const sPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns success requesting the deletion of a PeerRelationshipAttribute", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const sPeerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPeerRelationshipAttribute, thirdPartyAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), thirdPartyAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error requesting the deletion of a PeerRelationshipAttribute for third party it is not forwarded to", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const anotherThirdPartyAddress = CoreAddress.from("anotherThirdPartyAddress");
            const sPeerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPeerRelationshipAttribute, thirdPartyAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), anotherThirdPartyAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The deletion of a PeerRelationshipAttribute can only be requested from a third party it is shared with and who hasn't deleted it or agreed to its deletion already.`
            });
        });

        test("returns an error requesting the deletion of a PeerRelationshipAttribute for its owner", async function () {
            const sPeerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The deletion of a PeerRelationshipAttribute cannot be requested for the owner.`
            });
        });

        test("returns an error requesting the deletion of a PeerIdentityAttribute of a third party", async function () {
            const sPeerIdentityAttributeOfThirdParty = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: CoreAddress.from("ThirdParty")
                }),
                peer: CoreAddress.from("ThirdParty"),
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerIdentityAttributeOfThirdParty.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns an error requesting the deletion of an Attribute from yourself", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already."
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already deleted", async function () {
            const peerDeletedAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(peerDeletedAttribute, peerAddress, CoreId.from("aSourceReferenceId"));
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                peerDeletedAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                    deletionDate: CoreDate.utc()
                }),
                peerAddress
            );

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already."
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already marked for deletion", async function () {
            const peerToBeDeletedAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(peerToBeDeletedAttribute, peerAddress, CoreId.from("aSourceReferenceId"));
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                peerToBeDeletedAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }),
                peerAddress
            );

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerToBeDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The deletion of an own Attribute can only be requested from a peer it is shared with and who hasn't deleted it or agreed to its deletion already."
            });
        });

        test("returns an error requesting the deletion of an unknown Attribute", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("anUnknownAttributeId")
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' could not be found.`
            });
        });
    });

    describe("canAccept", function () {
        test("returns success when called with any deletionDate if Attribute doesn't exist", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: await CoreIdHelper.notPrefixed.generate()
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const freeTextDeletionDate = "I deleted the Attribute already";
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: freeTextDeletionDate
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns success when called with a valid date in the future", async function () {
            const rPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInFuture = CoreDate.utc().add({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInFuture.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns an error when called with a valid date in the past", async function () {
            const rPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInPast = CoreDate.utc().subtract({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInPast.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "The deletionDate must be in the future."
            });
        });

        test("returns an error when called with an invalid date", async function () {
            const rPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const invalidDate = "tomorrow";
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: invalidDate
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "The deletionDate is invalid."
            });
        });
    });

    describe("accept", function () {
        test("returns a DeleteAttributeAcceptResponseItem", async function () {
            const rPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInFuture = CoreDate.utc().add({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInFuture.toString()
            };

            const responseItem = await processor.accept(requestItem, acceptParams, incomingRequest);

            expect(responseItem).toBeDefined();
            expect(responseItem).toBeInstanceOf(DeleteAttributeAcceptResponseItem);
            expect(responseItem.result).toStrictEqual(ResponseItemResult.Accepted);
            expect((responseItem as DeleteAttributeAcceptResponseItem).deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a PeerIdentityAttribute", async function () {
            const rPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInFuture = CoreDate.utc().add({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInFuture.toString()
            };

            await processor.accept(requestItem, acceptParams, incomingRequest);

            const updatedPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(rPeerIdentityAttribute.id);
            expect((updatedPeerIdentityAttribute as PeerIdentityAttribute).deletionInfo).toBeDefined();
            expect((updatedPeerIdentityAttribute as PeerIdentityAttribute).deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.ToBeDeleted);
            expect((updatedPeerIdentityAttribute as PeerIdentityAttribute).deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a PeerRelationshipAttribute", async function () {
            const rPeerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerRelationshipAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInFuture = CoreDate.utc().add({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInFuture.toString()
            };

            await processor.accept(requestItem, acceptParams, incomingRequest);

            const updatedPeerRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(rPeerRelationshipAttribute.id);
            expect((updatedPeerRelationshipAttribute as PeerRelationshipAttribute).deletionInfo).toBeDefined();
            expect((updatedPeerRelationshipAttribute as PeerRelationshipAttribute).deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.ToBeDeleted);
            expect((updatedPeerRelationshipAttribute as PeerRelationshipAttribute).deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });

        test("returns an AcceptResponseItem", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: (await CoreIdHelper.notPrefixed.generate()).toString()
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const dateInFuture = CoreDate.utc().add({ days: 1 });
            const acceptParams: AcceptDeleteAttributeRequestItemParametersJSON = {
                accept: true,
                deletionDate: dateInFuture.toString()
            };

            const responseItem = await processor.accept(requestItem, acceptParams, incomingRequest);

            expect(responseItem).toBeDefined();
            expect(responseItem).toBeInstanceOf(AcceptResponseItem);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("doesn't change the deletionInfo if a simple AcceptResponseItem is returned", async function () {
            const deletionDate = CoreDate.utc().subtract({ days: 1 });
            const deletedByRecipientAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(deletedByRecipientAttribute, peerAddress, CoreId.from("aSourceReferenceId"));
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                deletedByRecipientAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                    deletionDate: deletionDate
                }),
                peerAddress
            );

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: deletedByRecipientAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = AcceptResponseItem.from({ result: ResponseItemResult.Accepted });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const unchangedAttribute = (await consumptionController.attributes.getLocalAttribute(deletedByRecipientAttribute.id)) as OwnIdentityAttribute;
            expect(unchangedAttribute.forwardedSharingDetails).toHaveLength(1);
            expect(unchangedAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);
            expect(unchangedAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo if the Attribute is DeletedByRecipient", async function () {
            const deletionDate = CoreDate.utc().subtract({ days: 1 });
            const deletedByRecipientAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(deletedByRecipientAttribute, peerAddress, CoreId.from("aSourceReferenceId"));
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                deletedByRecipientAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                    deletionDate: deletionDate
                }),
                peerAddress
            );

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: deletedByRecipientAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseDeletionDate = CoreDate.utc().add({ days: 1 });
            const responseItem = DeleteAttributeAcceptResponseItem.from({
                deletionDate: responseDeletionDate,
                result: ResponseItemResult.Accepted
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const unchangedAttribute = (await consumptionController.attributes.getLocalAttribute(deletedByRecipientAttribute.id)) as OwnIdentityAttribute;
            expect(unchangedAttribute.forwardedSharingDetails).toHaveLength(1);
            expect(unchangedAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);
            expect(unchangedAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByRecipient of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const deletionDate = CoreDate.utc().add({ days: 1 });
            const responseItem = DeleteAttributeAcceptResponseItem.from({
                deletionDate: deletionDate,
                result: ResponseItemResult.Accepted
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(sOwnIdentityAttribute.id)) as OwnIdentityAttribute;
            expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
            expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.ToBeDeletedByRecipient);
            expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByRecipient of an OwnRelationshipAttribute", async function () {
            const sOwnRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnRelationshipAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const deletionDate = CoreDate.utc().add({ days: 1 });
            const responseItem = DeleteAttributeAcceptResponseItem.from({
                deletionDate: deletionDate,
                result: ResponseItemResult.Accepted
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const updatedOwnRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(sOwnRelationshipAttribute.id);
            expect((updatedOwnRelationshipAttribute as OwnRelationshipAttribute).deletionInfo).toBeDefined();
            expect((updatedOwnRelationshipAttribute as OwnRelationshipAttribute).deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.ToBeDeletedByRecipient);
            expect((updatedOwnRelationshipAttribute as OwnRelationshipAttribute).deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByRecipient of the predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPredecessorOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const successorParams = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                })
            });
            const { successor: sOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(sPredecessorOwnIdentityAttribute, successorParams);

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("anotherSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const deletionDate = CoreDate.utc().add({ days: 1 });
            const responseItem = DeleteAttributeAcceptResponseItem.from({
                deletionDate: deletionDate,
                result: ResponseItemResult.Accepted
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const updatedPredecessorOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
            expect(updatedPredecessorOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
            expect(updatedPredecessorOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(
                EmittedAttributeDeletionStatus.ToBeDeletedByRecipient
            );
            expect(updatedPredecessorOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to ToBeDeletedByRecipient of a DeletedByRecipient predecessor of a forwarded OwnIdentityAttribute", async function () {
            const predecessorDeletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPredecessorOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const successorParams = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                })
            });
            const { successor: sOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(sPredecessorOwnIdentityAttribute, successorParams);

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                sPredecessorOwnIdentityAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                    deletionDate: predecessorDeletionDate
                }),
                peerAddress
            );

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("anotherSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const deletionDate = CoreDate.utc().add({ days: 1 });
            const responseItem = DeleteAttributeAcceptResponseItem.from({
                deletionDate: deletionDate,
                result: ResponseItemResult.Accepted
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const unchangedPredecessor = (await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
            expect(unchangedPredecessor.forwardedSharingDetails).toHaveLength(1);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(predecessorDeletionDate);
        });

        test("sets the deletionInfo to DeletionRequestRejected of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = RejectResponseItem.from({
                result: ResponseItemResult.Rejected
            });

            const timeBeforeUpdate = CoreDate.utc();
            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            const timeAfterUpdate = CoreDate.utc();

            const updatedOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sOwnIdentityAttribute.id);
            const peerSharingDetails = (updatedOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails!.find((sharingDetails) =>
                sharingDetails.peer.equals(peerAddress)
            );
            expect(peerSharingDetails!.deletionInfo).toBeDefined();
            expect(peerSharingDetails!.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletionRequestRejected);
            expect(peerSharingDetails!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")).toBe(true);
        });

        test("sets the deletionInfo to DeletionRequestRejected of the predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPredecessorOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const successorParams = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                })
            });
            const { successor: sOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(sPredecessorOwnIdentityAttribute, successorParams);

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("anotherSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = RejectResponseItem.from({
                result: ResponseItemResult.Rejected
            });

            const timeBeforeUpdate = CoreDate.utc();
            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            const timeAfterUpdate = CoreDate.utc();

            const updatedPredecessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id);
            const peerSharingDetails = (updatedPredecessorOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails!.find((sharingDetails) =>
                sharingDetails.peer.equals(peerAddress)
            );
            expect(peerSharingDetails!.deletionInfo).toBeDefined();
            expect(peerSharingDetails!.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletionRequestRejected);
            expect(peerSharingDetails!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")).toBe(true);
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a ToBeDeletedByRecipient predecessor of a forwarded OwnIdentityAttribute", async function () {
            const deletionDate = CoreDate.utc().add({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPredecessorOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const successorParams = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                })
            });
            const { successor: sOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(sPredecessorOwnIdentityAttribute, successorParams);

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                sPredecessorOwnIdentityAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
                    deletionDate: deletionDate
                }),
                peerAddress
            );

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("anotherSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = RejectResponseItem.from({
                result: ResponseItemResult.Rejected
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const unchangedPredecessor = (await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
            expect(unchangedPredecessor.forwardedSharingDetails).toHaveLength(1);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.ToBeDeletedByRecipient);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a DeletedByRecipient predecessor of a forwarded OwnIdentityAttribute", async function () {
            const deletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sPredecessorOwnIdentityAttribute, peerAddress, CoreId.from("aSourceReferenceId"));

            const successorParams = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                })
            });
            const { successor: sOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(sPredecessorOwnIdentityAttribute, successorParams);

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                sPredecessorOwnIdentityAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                    deletionDate: deletionDate
                }),
                peerAddress
            );

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(sOwnIdentityAttribute, peerAddress, CoreId.from("anotherSourceReferenceId"));

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peerAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = RejectResponseItem.from({
                result: ResponseItemResult.Rejected
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const unchangedPredecessor = (await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
            expect(unchangedPredecessor.forwardedSharingDetails).toHaveLength(1);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);
            expect(unchangedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });
    });
});
