import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    GivenName,
    IdentityAttribute,
    IdentityAttributeQuery,
    ProposeAttributeRequestItem,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport";
import {
    AcceptProposeAttributeRequestItemParametersJSON,
    AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalRequest,
    LocalRequestStatus,
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
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(function () {
        processor = new ProposeAttributeRequestItemProcessor(consumptionController);
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

            const existingLocalAttribute = await consumptionController.attributes.createLocalAttribute({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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

            const attribute = await consumptionController.attributes.createPeerLocalAttribute({
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

        test("returns an error when a Successor of the existing IdentityAttribute is already shared", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const repositoryAttribute = await consumptionController.attributes.createLocalAttribute({
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
                message: `The provided IdentityAttribute is outdated. You have already shared the Successor '${ownSharedCopyOfSuccessor.shareInfo?.sourceAttribute?.toString()}' of it.`
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

            const localAttribute = await consumptionController.attributes.createLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient,
                    value: ProprietaryString.from({
                        title: "ATitle",
                        value: "AnotherStringValue"
                    })
                }),
                shareInfo: {
                    peer: sender,
                    requestReference: await ConsumptionIds.request.generate()
                }
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: localAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.canAccept.invalidAcceptParameters",
                message: "When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided."
            });
        });
    });

    describe("accept", function () {
        test("in case of a given attributeId of an own Local Attribute, creates a copy of the Local Attribute with the given id with share info for the Recipient of the Request", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const attribute = await consumptionController.attributes.createLocalAttribute({
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
                accept: true,
                attributeId: attribute.id.toString()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
        });

        test("in case of accepting the proposed Attribute, creates the Local Attribute and a copy of the Local Attribute with the given id with share info for the Recipient of the Request", async function () {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
                accept: true,
                attribute: requestItem.attribute.toJSON()
            };

            const result = await processor.accept(requestItem, acceptParams, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdAttribute!.content.owner.toString()).toStrictEqual(recipient.toString());
        });

        test("in case of a given own IdentityAttribute, creates a new Repository Attribute as well as a copy of it for the Recipient", async function () {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeDefined();

            const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
            expect(createdRepositoryAttribute).toBeDefined();
        });

        test("in case of a given peer RelationshipAttribute, creates a new Local Attribute with share info for the Recipient of the Request - but no Repository Attribute", async function () {
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

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
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
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdSharedAttribute!.content.owner.toString()).toStrictEqual(recipient.toString());
        });
    });
});
