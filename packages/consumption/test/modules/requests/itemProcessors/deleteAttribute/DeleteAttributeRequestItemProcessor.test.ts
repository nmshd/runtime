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
    LocalRequest,
    LocalRequestStatus
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
            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns success requesting the deletion of an OwnRelationshipAttribute", async function () {
            const sOwnRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error requesting the deletion of an OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own IdentityAttribute, own RelationshipAttribute or peer RelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns an error requesting the deletion of a PeerIdentityAttribute", async function () {
            const sPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own IdentityAttribute, own RelationshipAttribute or peer RelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns an error requesting the deletion of a PeerRelationshipAttribute", async function () {
            const sPeerRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own IdentityAttribute, own RelationshipAttribute or peer RelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns an error requesting the deletion of a shared IdentityAttribute of a third party", async function () {
            const sThirdPartySharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: CoreAddress.from("ThirdParty"),
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sThirdPartySharedIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own IdentityAttribute, own RelationshipAttribute or peer RelationshipAttribute. You can only request the deletion of such Attributes.`
            });
        });

        test("returns an error requesting the deletion of an Attribute from yourself", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The deletion of a shared Attribute can only be requested from the peer the Attribute is shared with."
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already deleted", async function () {
            const peerDeletedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc()
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The Attribute was already deleted by the peer."
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already marked for deletion", async function () {
            const peerToBeDeletedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerToBeDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The peer already accepted the deletion of the Attribute."
            });
        });

        test("returns an error requesting the deletion of an unknown Attribute", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("ATTxxxxxxxxxxxxxxxxx")
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
            const rPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            const rPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            const rPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            const rPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            const rPeerIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            expect(updatedPeerIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPeerIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeleted);
            expect(updatedPeerIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a PeerRelationshipAttribute", async function () {
            const rPeerRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            expect(updatedPeerRelationshipAttribute!.deletionInfo).toBeDefined();
            expect(updatedPeerRelationshipAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeleted);
            expect(updatedPeerRelationshipAttribute!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
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
            const deletedByPeerAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: deletedByPeerAttribute.id
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

            const unchangedAttribute = await consumptionController.attributes.getLocalAttribute(deletedByPeerAttribute.id);
            expect(unchangedAttribute!.deletionInfo).toBeDefined();
            expect(unchangedAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(unchangedAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo if the Attribute is DeletedByPeer", async function () {
            const deletionDate = CoreDate.utc().subtract({ days: 1 });
            const deletedByPeerAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: deletedByPeerAttribute.id
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

            const unchangedAttribute = await consumptionController.attributes.getLocalAttribute(deletedByPeerAttribute.id);
            expect(unchangedAttribute!.deletionInfo).toBeDefined();
            expect(unchangedAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(unchangedAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByPeer of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

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

            const updatedOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sOwnIdentityAttribute.id);
            expect(updatedOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedOwnIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByPeer of an OwnRelationshipAttribute", async function () {
            const sOwnRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
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
            expect(updatedOwnRelationshipAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnRelationshipAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedOwnRelationshipAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByPeer of the predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnIdentityAttributeId
            });

            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnIdentityAttribute.id
            });

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

            const updatedPredecessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to ToBeDeletedByPeer of a DeletedByPeer predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const predecessorDeletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: predecessorDeletionDate
                }
            });

            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnIdentityAttribute.id
            });

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

            const updatedPredecessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(predecessorDeletionDate);
        });

        test("sets the deletionInfo to DeletionRequestRejected of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                }
            });

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
            expect(updatedOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletionRequestRejected);
            expect(updatedOwnIdentityAttribute!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")).toBe(true);
        });

        test("sets the deletionInfo to DeletionRequestRejected of the predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnIdentityAttributeId
            });

            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnIdentityAttribute.id
            });

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
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletionRequestRejected);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")).toBe(
                true
            );
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a ToBeDeletedByPeer predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const deletionDate = CoreDate.utc().add({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnIdentityAttribute.id
            });

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

            const updatedPredecessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a DeletedByPeer predecessor of a forwarded OwnIdentityAttribute", async function () {
            const sOwnIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const deletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const sOwnIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnIdentityAttribute.id
            });

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

            const updatedPredecessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnIdentityAttribute.id);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(updatedPredecessorOwnIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });
    });
});
