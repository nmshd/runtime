import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    DeleteAttributeAcceptResponseItem,
    DeleteAttributeRequestItem,
    IdentityAttribute,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    AcceptDeleteAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    DeleteAttributeRequestItemProcessor,
    DeletionStatus,
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
            const sOSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: sOSIA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns success requesting the deletion of an own shared Relationship Attribute", async function () {
            const sOSRA = await consumptionController.attributes.createAttributeUnsafe({
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
                attributeId: sOSRA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error requesting the deletion of a Repository Attribute", async function () {
            const sRA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
                    },
                    owner: accountController.identity.address
                })
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: sRA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of a peer shared Identity Attribute", async function () {
            const sPSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: sPSIA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of a peer shared Relationship Attribute", async function () {
            const sPSRA = await consumptionController.attributes.createAttributeUnsafe({
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
                attributeId: sPSRA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of a shared Identity Attribute of a third party", async function () {
            const sThirdPartySIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: sThirdPartySIA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), peerAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of an Attribute from yourself", async function () {
            const sOSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: sOSIA.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already deleted", async function () {
            const peerDeletedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc()
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of an Attribute the peer already marked for deletion", async function () {
            const peerToBeDeletedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef"),
                    sourceAttribute: CoreId.from("repositoryAttribute")
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });

            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: peerToBeDeletedAttribute.id
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error requesting the deletion of an unknown Attribute", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("ATTxxxxxxxxxxxxxxxxx")
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), accountController.identity.address);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });
    });

    describe("canAccept", function () {
        test("returns success when called with a valid date in the future", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("ATT12345678901234567")
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

            const result = processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns an error when called with a valid date in the past", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("ATT12345678901234567")
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

            const result = processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters"
            });
        });

        test("returns an error when called with an invalid date", async function () {
            const requestItem = DeleteAttributeRequestItem.from({
                mustBeAccepted: false,
                attributeId: CoreId.from("ATT12345678901234567")
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

            const result = processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters"
            });
        });
    });

    describe("accept", function () {
        test("returns a DeleteAttributeAcceptResponseItem", async function () {
            const rPSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: rPSIA.id
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
            expect(responseItem.deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a peer shared Identity Attribute", async function () {
            const rPSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: rPSIA.id
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

            const updatedRPSIA = await consumptionController.attributes.getLocalAttribute(rPSIA.id);
            expect(updatedRPSIA!.deletionInfo).toBeDefined();
            expect(updatedRPSIA!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.ToBeDeleted);
            expect(updatedRPSIA!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });

        test("sets the deletionInfo of a peer shared Relationship Attribute", async function () {
            const rPSRA = await consumptionController.attributes.createAttributeUnsafe({
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
                attributeId: rPSRA.id
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

            const updatedRPSRA = await consumptionController.attributes.getLocalAttribute(rPSRA.id);
            expect(updatedRPSRA!.deletionInfo).toBeDefined();
            expect(updatedRPSRA!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.ToBeDeleted);
            expect(updatedRPSRA!.deletionInfo!.deletionDate).toStrictEqual(dateInFuture);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("sets the deletionInfo of an own shared Identity Attribute", async function () {
            const sOSIA = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
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
                attributeId: sOSIA.id
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

            const updatedSOSIA = await consumptionController.attributes.getLocalAttribute(sOSIA.id);
            expect(updatedSOSIA!.deletionInfo).toBeDefined();
            expect(updatedSOSIA!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.ToBeDeletedByPeer);
            expect(updatedSOSIA!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("sets the deletionInfo of an own shared Relationship Attribute", async function () {
            const sOSRA = await consumptionController.attributes.createAttributeUnsafe({
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
                attributeId: sOSRA.id
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

            const updatedSOSRA = await consumptionController.attributes.getLocalAttribute(sOSRA.id);
            expect(updatedSOSRA!.deletionInfo).toBeDefined();
            expect(updatedSOSRA!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.ToBeDeletedByPeer);
            expect(updatedSOSRA!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });

        test("doesn't change the deletionInfo if the Attribute is already deleted by peer", async function () {
            const deletionDate = CoreDate.utc().subtract({ days: 1 });
            const deletedByPeerAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "BirthName",
                        value: "Schenkel"
                    },
                    owner: accountController.identity.address
                }),
                shareInfo: {
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.DeletedByPeer,
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
            expect(unchangedAttribute!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.DeletedByPeer);
            expect(unchangedAttribute!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
        });
    });
});
