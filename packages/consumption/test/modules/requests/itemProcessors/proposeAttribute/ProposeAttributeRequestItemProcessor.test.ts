import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    GivenName,
    IdentityAttribute,
    IdentityAttributeQuery,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeRequestItem,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, CoreIdHelper, Transport } from "@nmshd/transport";
import {
    AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalAttributeDeletionInfo,
    LocalAttributeDeletionStatus,
    LocalAttributeShareInfo,
    LocalRequest,
    LocalRequestStatus,
    PeerSharedAttributeSucceededEvent,
    ProposeAttributeRequestItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";

describe("ProposeAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let processor: ProposeAttributeRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
        ({ accountController, consumptionController } = accounts[0]);

        processor = new ProposeAttributeRequestItemProcessor(consumptionController);
    });

    afterAll(async function () {
        await connection.close();
    });

    describe("canCreateOutgoingRequestItem", function () {
        test("returns success when proposing an Identity Attribute", function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({
                    valueType: "GivenName"
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when proposing a Relationship Attribute", function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "ATitle", value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    key: "AKey",
                    owner: CoreAddress.from(""),
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when passing anything other than an empty string as an owner into 'attribute'", function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "ATitle", value: "AGivenName" }),
                    owner: recipient
                }),
                query: RelationshipAttributeQuery.from({
                    key: "AKey",
                    owner: CoreAddress.from(""),
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error when passing anything other than an empty string as an owner into 'query'", function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "ATitle", value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    key: "AKey",
                    owner: recipient,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        describe("query", function () {
            describe("IdentityAttributeQuery", function () {
                test("simple query", function () {
                    const recipient = CoreAddress.from("Recipient");

                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
                        query: IdentityAttributeQuery.from({
                            valueType: "GivenName"
                        })
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                    expect(result).successfulValidationResult();
                });
            });

            describe("RelationshipAttributeQuery", function () {
                test("simple query", function () {
                    const recipient = CoreAddress.from("Recipient");

                    const query = RelationshipAttributeQuery.from({
                        owner: "",
                        key: "AKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "ATitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });

                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        query: query,
                        attribute: TestObjectFactory.createRelationshipAttribute({
                            value: ProprietaryString.fromAny({ title: "ATitle", value: "AGivenName" }),
                            owner: CoreAddress.from("")
                        })
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                    expect(result).successfulValidationResult();
                });
            });
        });
    });

    describe("canAccept", function () {
        test("returns success when called with the id of an existing own LocalAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const existingLocalAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({
                    valueType: "GivenName"
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: existingLocalAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns success when called with a new own Attribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns success when called with the proposed Attribute", async function () {
            const sender = CoreAddress.from("Sender");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: requestItem.attribute.toJSON()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("returns an error when the given Attribute id does not exist", async function () {
            const sender = CoreAddress.from("Sender");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: "non-existent-id"
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.transport.recordNotFound"
            });
        });

        test("returns an error when the existing IdentityAttribute is already shared", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const attribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                }),
                peer: sender,
                requestReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from("")
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: attribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes."
            });
        });

        test("returns an error when a successor of the existing IdentityAttribute is already shared", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            const ownSharedCopyOfSuccessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: successorOfRepositoryAttribute.id,
                peer: sender,
                requestReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from("")
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: repositoryAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${ownSharedCopyOfSuccessor.shareInfo?.sourceAttribute?.toString()}' of it.`
            });
        });

        test("returns an error when a RelationshipAttribute was queried and the Recipient tries to respond with an existing RelationshipAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: recipient.toString(),
                    key: "AKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                }),
                attribute: RelationshipAttribute.from({
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient,
                    value: ProprietaryString.from({
                        title: "ATitle",
                        value: "AStringValue"
                    })
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient,
                    value: ProprietaryString.from({
                        title: "ATitle",
                        value: "AnotherStringValue"
                    })
                }),
                peer: sender,
                requestReference: await ConsumptionIds.request.generate()
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: localAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided."
            });
        });

        test("returns an error trying to share the predecessor of an already shared Attribute", async function () {
            const sender = CoreAddress.from("Sender");

            const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
            });

            const { successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "A new given name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: successorRepositoryAttribute.id,
                peer: sender,
                requestReference: await CoreIdHelper.notPrefixed.generate()
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: predecessorRepositoryAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${successorRepositoryAttribute.id}' of it.`
            });
        });
    });

    describe("accept", function () {
        test("accept with existing RepositoryAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const attribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: attribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
        });

        test("accept proposed IdentityAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: requestItem.attribute.toJSON()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdAttribute!.content.owner.toString()).toStrictEqual(recipient.toString());
        });

        test("in case of accepting with a new IdentityAttribute, create a new RepositoryAttribute as well as a copy of it for the Recipient", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeDefined();

            const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
            expect(createdRepositoryAttribute).toBeDefined();
        });

        test("accept with new RelationshipAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    key: "AKey",
                    owner: "",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                }),
                attribute: TestObjectFactory.createRelationshipAttribute()
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "RelationshipAttribute",
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: "",
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdSharedAttribute!.content.owner.toString()).toStrictEqual(recipient.toString());
        });

        test("accept with existing IdentityAttribute whose predecessor was already shared", async function () {
            const sender = CoreAddress.from("Sender");

            const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
            });

            const predecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: predecessorRepositoryAttribute.id,
                peer: sender,
                requestReference: CoreId.from("initialRequest")
            });

            const { successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "A new given name"
                    },
                    owner: accountController.identity.address
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: successorRepositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

            const successorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOwnSharedIdentityAttribute).toBeDefined();
            expect(successorOwnSharedIdentityAttribute!.shareInfo).toBeDefined();
            expect(successorOwnSharedIdentityAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toStrictEqual(successorRepositoryAttribute.id);
            expect(successorOwnSharedIdentityAttribute!.succeeds).toStrictEqual(predecessorOwnSharedIdentityAttribute.id);

            const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedIdentityAttribute.id);
            expect(updatedPredecessorOwnSharedIdentityAttribute!.succeededBy).toStrictEqual(successorOwnSharedIdentityAttribute!.id);
        });

        test("accept with existing IdentityAttribute whose predecessor was already shared but is DeletedByPeer", async function () {
            const sender = CoreAddress.from("Sender");

            const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
            });

            const { successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "A succeeded given name"
                    },
                    owner: accountController.identity.address
                })
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    sourceAttribute: predecessorRepositoryAttribute.id,
                    peer: sender,
                    requestReference: await CoreIdHelper.notPrefixed.generate()
                }),
                deletionInfo: LocalAttributeDeletionInfo.from({
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: successorRepositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute!.content).toStrictEqual(successorRepositoryAttribute.content);
            expect(createdAttribute!.deletionInfo).toBeUndefined();
            expect(createdAttribute!.succeeds).toBeUndefined();
        });

        test("accept with existing IdentityAttribute whose predecessor was already shared but is ToBeDeletedByPeer", async function () {
            const sender = CoreAddress.from("Sender");

            const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const { successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "A succeeded given name"
                    },
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    sourceAttribute: predecessorRepositoryAttribute.id,
                    peer: sender,
                    requestReference: await CoreIdHelper.notPrefixed.generate()
                }),
                deletionInfo: LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc().add({ days: 1 }) })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: successorRepositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute!.content).toStrictEqual(successorRepositoryAttribute.content);
            expect(createdAttribute!.deletionInfo).toBeUndefined();
            expect(createdAttribute!.succeeds).toBeUndefined();
        });

        test("accept with existing IdentityAttribute that is already shared and the latest shared version", async function () {
            const sender = CoreAddress.from("Sender");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
            });

            const alreadySharedAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttribute.id,
                peer: sender,
                requestReference: await CoreIdHelper.notPrefixed.generate()
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: repositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
            expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(alreadySharedAttribute.id);
        });

        test("accept with existing IdentityAttribute that is already shared and the latest shared version but is DeletedByPeer", async function () {
            const sender = CoreAddress.from("Sender");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
            });

            const alreadySharedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                }),
                shareInfo: LocalAttributeShareInfo.from({ sourceAttribute: repositoryAttribute.id, peer: sender, requestReference: await CoreIdHelper.notPrefixed.generate() }),
                deletionInfo: LocalAttributeDeletionInfo.from({
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: repositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute!.content).toStrictEqual(alreadySharedAttribute.content);
            expect(createdAttribute!.deletionInfo).toBeUndefined();
        });

        test("accept with existing IdentityAttribute that is already shared and the latest shared version but is ToBeDeletedByPeer", async function () {
            const sender = CoreAddress.from("Sender");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const alreadySharedAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                }),
                shareInfo: LocalAttributeShareInfo.from({ sourceAttribute: repositoryAttribute.id, peer: sender, requestReference: await CoreIdHelper.notPrefixed.generate() }),
                deletionInfo: LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc().add({ days: 1 }) })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: repositoryAttribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);
            expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
            expect(createdAttribute!.content).toStrictEqual(alreadySharedAttribute.content);
            expect(createdAttribute!.deletionInfo).toBeUndefined();
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates a new peer shared Attribute with the Attribute received in the ResponseItem", async function () {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
            });
            const requestId = await ConsumptionIds.request.generate();
            const peer = CoreAddress.from("did:e:a-domain:dids:anidentity");

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

            const responseItem = ProposeAttributeAcceptResponseItem.from({
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
            const sender = CoreAddress.from("Sender");

            const predecessorPeerSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                }),
                peer: sender,
                requestReference: CoreId.from("oldReqRef")
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute()
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

            const successorId = await ConsumptionIds.attribute.generate();
            const responseItem = AttributeSuccessionAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                predecessorId: predecessorPeerSharedIdentityAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const event = await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            expect(event).toBeInstanceOf(PeerSharedAttributeSucceededEvent);

            const successorPeerSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPeerSharedIdentityAttribute).toBeDefined();
            expect(successorPeerSharedIdentityAttribute!.shareInfo).toBeDefined();
            expect(successorPeerSharedIdentityAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorPeerSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(successorPeerSharedIdentityAttribute!.succeeds).toStrictEqual(predecessorPeerSharedIdentityAttribute.id);

            const updatedPredecessorPeerSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorPeerSharedIdentityAttribute.id);
            expect(updatedPredecessorPeerSharedIdentityAttribute!.succeededBy).toStrictEqual(successorPeerSharedIdentityAttribute!.id);
        });
    });
});
