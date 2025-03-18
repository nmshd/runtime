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
    LocalAttributeDeletionStatus,
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
        transport = TestUtil.createTransport(connection);
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
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
        test("returns success requesting the deletion of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns success requesting the deletion of an own shared Relationship Attribute", async function () {
            const sOwnSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error requesting the deletion of a Repository Attribute", async function () {
            const sRepositoryAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                attributeId: sRepositoryAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
            });
        });

        test("returns an error requesting the deletion of a peer shared Identity Attribute", async function () {
            const sPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerSharedIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
            });
        });

        test("returns an error requesting the deletion of a peer shared Relationship Attribute", async function () {
            const sPeerSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sPeerSharedRelationshipAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
            });
        });

        test("returns an error requesting the deletion of a shared Identity Attribute of a third party", async function () {
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
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sThirdPartySharedIdentityAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute '${requestItem.attributeId.toString()}' is not an own shared Attribute. You can only request the deletion of own shared Attributes.`
            });
        });

        test("returns an error requesting the deletion of an Attribute from yourself", async function () {
            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
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
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
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
            const rPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedIdentityAttribute.id
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
            const rPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedIdentityAttribute.id
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
            const rPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedIdentityAttribute.id
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
            const rPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedIdentityAttribute.id
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

        test("sets the deletionInfo of a peer shared Identity Attribute", async function () {
            const rPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: peerAddress
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedIdentityAttribute.id
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

            const updatedPeerSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(rPeerSharedIdentityAttribute.id);
            expect(updatedPeerSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPeerSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeleted);
            expect(updatedPeerSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a peer shared Relationship Attribute", async function () {
            const rPeerSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: rPeerSharedRelationshipAttribute.id
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

            const updatedPeerSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(rPeerSharedRelationshipAttribute.id);
            expect(updatedPeerSharedRelationshipAttribute!.deletionInfo).toBeDefined();
            expect(updatedPeerSharedRelationshipAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeleted);
            expect(updatedPeerSharedRelationshipAttribute!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
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
                    requestReference: CoreId.from("reqRef")
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
                    requestReference: CoreId.from("reqRef")
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

        test("sets the deletionInfo to ToBeDeletedByPeer of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sOwnSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByPeer of an own shared Relationship Attribute", async function () {
            const sOwnSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedRelationshipAttribute.id
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

            const updatedOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(sOwnSharedRelationshipAttribute.id);
            expect(updatedOwnSharedRelationshipAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnSharedRelationshipAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedOwnSharedRelationshipAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo to ToBeDeletedByPeer of the predecessor of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const sPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnSharedIdentityAttributeId
            });

            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnSharedIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnSharedIdentityAttribute.id
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to ToBeDeletedByPeer of a DeletedByPeer predecessor of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const predecessorDeletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnSharedIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: predecessorDeletionDate
                }
            });

            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnSharedIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnSharedIdentityAttribute.id
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(predecessorDeletionDate);
        });

        test("sets the deletionInfo to DeletionRequestRejected of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sOwnSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletionRequestRejected);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")).toBe(true);
        });

        test("sets the deletionInfo to DeletionRequestRejected of the predecessor of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const sPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnSharedIdentityAttributeId
            });

            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnSharedIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnSharedIdentityAttribute.id
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletionRequestRejected);
            expect(
                updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionDate.isBetween(timeBeforeUpdate, timeAfterUpdate.add({ milliseconds: 1 }), "millisecond")
            ).toBe(true);
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a ToBeDeletedByPeer predecessor of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const deletionDate = CoreDate.utc().add({ days: 1 });

            const sPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnSharedIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnSharedIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnSharedIdentityAttribute.id
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo to DeletionRequestRejected of a DeletedByPeer predecessor of an own shared Identity Attribute", async function () {
            const sOwnSharedIdentityAttributeId = await ConsumptionIds.attribute.generate();
            const deletionDate = CoreDate.utc().subtract({ days: 1 });

            const sPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeededBy: sOwnSharedIdentityAttributeId,
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: deletionDate
                }
            });

            const sOwnSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                id: sOwnSharedIdentityAttributeId,
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "A succeeded birth name"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                succeeds: sPredecessorOwnSharedIdentityAttribute.id
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sOwnSharedIdentityAttribute.id
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

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(sPredecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo).toBeDefined();
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });
    });
});
