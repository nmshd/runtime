import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    IdentityAttribute,
    IdentityAttributeQuery,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalAttributeShareInfo,
    LocalRequest,
    LocalRequestStatus,
    PeerSharedAttributeSucceededEvent,
    ReadAttributeRequestItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";

describe("ReadAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let processor: ReadAttributeRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        ({ accountController, consumptionController } = accounts[0]);
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(function () {
        processor = new ReadAttributeRequestItemProcessor(consumptionController);
    });

    describe("canCreateOutgoingRequestItem", function () {
        describe("IdentityAttributeQuery", function () {
            test("simple query", function () {
                const query = IdentityAttributeQuery.from({
                    valueType: "GivenName"
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipientAddress"));

                expect(result).successfulValidationResult();
            });
        });

        describe("RelationshipAttributeQuery", function () {
            enum TestIdentity {
                Self,
                Recipient,
                OtherWithRelationship,
                OtherWithoutRelationship,
                ThirdParty
            }

            interface TestParams {
                description: string;
                input: {
                    owner: TestIdentity;
                    thirdParty?: TestIdentity;
                };
                expectedOutput:
                    | {
                          success: true;
                      }
                    | { errorMessage?: string; errorCode?: string };
            }

            const testParams: TestParams[] = [
                {
                    description: "query with owner=self, used for e.g. electric meter number",
                    input: {
                        owner: TestIdentity.Self
                    },
                    expectedOutput: {
                        success: true
                    }
                },
                {
                    description: "query with owner=thirdParty=someThirdParty, used for e.g. the bonuscard-number of a different company",
                    input: {
                        owner: TestIdentity.ThirdParty,
                        thirdParty: TestIdentity.ThirdParty
                    },
                    expectedOutput: {
                        success: true
                    }
                },
                {
                    description: "cannot query own attributes from third party",
                    input: {
                        owner: TestIdentity.Self,
                        thirdParty: TestIdentity.ThirdParty
                    },
                    expectedOutput: {
                        errorCode: "error.consumption.requests.invalidRequestItem",
                        errorMessage: "Cannot query own Attributes from a third party."
                    }
                },
                {
                    description: "cannot query with thirdParty = self",
                    input: {
                        owner: TestIdentity.Self,
                        thirdParty: TestIdentity.Self
                    },
                    expectedOutput: {
                        errorCode: "error.consumption.requests.invalidRequestItem",
                        errorMessage: "Cannot query an Attribute with the own address as third party."
                    }
                },
                {
                    description: "cannot query with thirdParty = recipient",
                    input: {
                        owner: TestIdentity.Recipient,
                        thirdParty: TestIdentity.Recipient
                    },
                    expectedOutput: {
                        errorCode: "error.consumption.requests.invalidRequestItem",
                        errorMessage: "Cannot query an Attribute with the recipient's address as third party."
                    }
                }
            ];
            test.each(testParams)("$description", function (testParams: TestParams) {
                function translateTestIdentityToAddress(testIdentity: TestIdentity) {
                    switch (testIdentity) {
                        case TestIdentity.Self:
                            return accountController.identity.address.toString();
                        case TestIdentity.Recipient:
                            return CoreAddress.from("recipientAddress").toString();
                        case TestIdentity.OtherWithRelationship:
                            return CoreAddress.from("recipientAddress").toString();
                        case TestIdentity.OtherWithoutRelationship:
                            return "someAddressWithoutRelationship";
                        case TestIdentity.ThirdParty:
                            return "someThirdPartyAddress";
                        default:
                            throw new Error("Given TestIdentity does not exist");
                    }
                }

                let query: RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery;
                if (testParams.input.thirdParty !== undefined) {
                    query = ThirdPartyRelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner),
                        key: "aKey",
                        thirdParty: [translateTestIdentityToAddress(testParams.input.thirdParty)]
                    });
                } else {
                    query = RelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner),
                        key: "aKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "ATitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });
                }

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipientAddress"));

                if (testParams.expectedOutput.hasOwnProperty("success")) {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(result).successfulValidationResult();
                } else {
                    const error = testParams.expectedOutput as { errorCode?: string; errorMessage?: string };
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(result).errorValidationResult({
                        code: error.errorCode,
                        message: error.errorMessage
                    });
                }
            });
        });
    });

    describe("canAccept", function () {
        test("can be called with the id of an existing own LocalAttribute", async function () {
            const attribute = await consumptionController.attributes.createPeerLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                }),
                peer: CoreAddress.from(accountController.identity.address),
                requestReference: CoreId.from("someRequestReference")
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: attribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("can be called with a new Attribute", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "IdentityAttribute",
                    owner: accountController.identity.address.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("can be called with an existing RelationshipAttribute by a third party", async function () {
            const attribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: CoreAddress.from("id1")
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: "id1",
                    thirdParty: ["id1"]
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: attribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns an error when the given Attribute id does not exist", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: "non-existent-id"
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.transport.recordNotFound"
            });
        });

        test("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
            const peer = CoreAddress.from("id1");

            const peerAttributeId = await ConsumptionIds.attribute.generate();

            await consumptionController.attributes.createPeerLocalAttribute({
                id: peerAttributeId,
                content: TestObjectFactory.createIdentityAttribute({
                    owner: peer
                }),
                peer: peer,
                requestReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peer,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: peerAttributeId.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: /The given Attribute belongs to someone else. You can only share own Attributes./
            });
        });
    });

    describe("accept", function () {
        test("accept with existing Attribute that wasn't shared before", async function () {
            const attribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: attribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
        });

        test("accept with new IdentityAttribute", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("id1"),
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "IdentityAttribute",
                    owner: accountController.identity.address.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeDefined();

            const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
            expect(createdRepositoryAttribute).toBeDefined();
        });

        test("accept with new RelationshipAttribute", async function () {
            const senderAddress = accountController.identity.address;
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: senderAddress,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: senderAddress,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "RelationshipAttribute",
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: senderAddress.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("accept with existing IdentityAttribute whose predecessor was already shared", async function () {
            const peerAddress = CoreAddress.from("peerAddress");

            const predecessorRA = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const predecessorOSIA = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: predecessorRA.id,
                peer: peerAddress,
                requestReference: CoreId.from("initialRequest")
            });

            const { successor: successorRA } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRA.id, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "US"
                    },
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: successorRA.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

            const successorOSIA = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOSIA).toBeDefined();
            expect(successorOSIA!.shareInfo).toBeDefined();
            expect(successorOSIA!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOSIA!.shareInfo!.sourceAttribute).toStrictEqual(successorRA.id);
            expect(successorOSIA!.succeeds).toStrictEqual(predecessorOSIA.id);

            const updatedPredecessorOSIA = await consumptionController.attributes.getLocalAttribute(predecessorOSIA.id);
            expect(updatedPredecessorOSIA!.succeededBy).toStrictEqual(successorOSIA!.id);
        });

        test("accept with existing IdentityAttribute that is already shared and the latest shared version", async function () {
            const sender = CoreAddress.from("Sender");

            const repositoryAttribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const alreadySharedAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttribute.id,
                peer: sender,
                requestReference: await CoreId.generate()
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });

            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: repositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
            expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(alreadySharedAttribute.id);
        });

        test("accept with existing own shared third party RelationshipAttribute whose predecessor was already shared", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const peerAddress = CoreAddress.from("peerAddress");

            const predecessorSourceAttribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: thirdPartyAddress,
                    requestReference: CoreId.from("reqRef")
                })
            });

            const predecessorOSRA = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: predecessorSourceAttribute.id,
                peer: peerAddress,
                requestReference: CoreId.from("initialRequest")
            });

            const { successor: successorSourceAttribute } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(predecessorSourceAttribute.id, {
                content: RelationshipAttribute.from({
                    value: {
                        "@type": "ProprietaryString",
                        title: "A new title",
                        value: "A new value"
                    },
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey",
                    owner: CoreAddress.from(accountController.identity.address)
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: thirdPartyAddress,
                    notificationReference: CoreId.from("successionNotification")
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: accountController.identity.address,
                    thirdParty: [thirdPartyAddress]
                })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: successorSourceAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

            const successorOSIA = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOSIA).toBeDefined();
            expect(successorOSIA!.shareInfo).toBeDefined();
            expect(successorOSIA!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOSIA?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
            expect(successorOSIA!.succeeds).toStrictEqual(predecessorOSRA.id);

            const updatedPredecessorOSIA = await consumptionController.attributes.getLocalAttribute(predecessorOSRA.id);
            expect(updatedPredecessorOSIA!.succeededBy).toStrictEqual(successorOSIA!.id);
        });

        test("accept with existing third party owned RelationshipAttribute whose predecessor was already shared", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const peerAddress = CoreAddress.from("peerAddress");

            const predecessorSourceAttribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: thirdPartyAddress,
                    requestReference: CoreId.from("reqRef")
                })
            });

            const predecessorOSRA = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: predecessorSourceAttribute.id,
                peer: peerAddress,
                requestReference: CoreId.from("initialRequest")
            });

            const { successor: successorSourceAttribute } = await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(predecessorSourceAttribute.id, {
                content: RelationshipAttribute.from({
                    value: {
                        "@type": "ProprietaryString",
                        title: "A new title",
                        value: "A new value"
                    },
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey",
                    owner: thirdPartyAddress
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: thirdPartyAddress,
                    notificationReference: CoreId.from("successionNotification")
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: accountController.identity.address,
                    thirdParty: [thirdPartyAddress]
                })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: successorSourceAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

            const successorOSIA = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOSIA).toBeDefined();
            expect(successorOSIA!.shareInfo).toBeDefined();
            expect(successorOSIA!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOSIA?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
            expect(successorOSIA!.succeeds).toStrictEqual(predecessorOSRA.id);

            const updatedPredecessorOSIA = await consumptionController.attributes.getLocalAttribute(predecessorOSRA.id);
            expect(updatedPredecessorOSIA!.succeededBy).toStrictEqual(successorOSIA!.id);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates a new peer shared Attribute with the Attribute received in the ResponseItem", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const peer = CoreAddress.from("id1");

            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: peer,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });
            const attributeId = await ConsumptionIds.attribute.generate();

            const responseItem = ReadAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: attributeId,
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: peer
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("succeeds an existing peer shared IdentityAttribute with the Attribute received in the ResponseItem", async function () {
            const peerAddress = CoreAddress.from("peerAddress");

            const predecessorPSIA = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: peerAddress
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: peerAddress,
                    requestReference: CoreId.from("oldReqRef")
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

            const successorId = await ConsumptionIds.attribute.generate();
            const responseItem = AttributeSuccessionAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                predecessorId: predecessorPSIA.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createIdentityAttribute({
                    owner: peerAddress
                })
            });

            const event = await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            expect(event).toBeInstanceOf(PeerSharedAttributeSucceededEvent);

            const successorPSIA = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPSIA).toBeDefined();
            expect(successorPSIA!.shareInfo).toBeDefined();
            expect(successorPSIA!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorPSIA!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(successorPSIA!.succeeds).toStrictEqual(predecessorPSIA.id);

            const updatedPredecessorPSIA = await consumptionController.attributes.getLocalAttribute(predecessorPSIA.id);
            expect(updatedPredecessorPSIA!.succeededBy).toStrictEqual(successorPSIA!.id);
        });

        test("succeeds an existing third party owned RelationshipAttribute with the Attribute received in the ResponseItem", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const peerAddress = CoreAddress.from("peerAddress");

            const predecessorPSRA = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: peerAddress,
                    requestReference: CoreId.from("oldReqRef")
                })
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: thirdPartyAddress,
                    thirdParty: [thirdPartyAddress]
                })
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

            const successorId = await ConsumptionIds.attribute.generate();
            const responseItem = AttributeSuccessionAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                predecessorId: predecessorPSRA.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const successorPSRA = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPSRA).toBeDefined();
            expect(successorPSRA!.shareInfo).toBeDefined();
            expect(successorPSRA!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorPSRA!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(successorPSRA!.succeeds).toStrictEqual(predecessorPSRA.id);

            const updatedPredecessorPSRA = await consumptionController.attributes.getLocalAttribute(predecessorPSRA.id);
            expect(updatedPredecessorPSRA!.succeededBy).toStrictEqual(successorPSRA!.id);
        });
    });
});
