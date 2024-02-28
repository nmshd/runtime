import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    GivenName,
    IdentityAttribute,
    IdentityAttributeQuery,
    ProposeAttributeRequestItem,
    ProprietaryString,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport";
import {
    AcceptProposeAttributeRequestItemParametersJSON,
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

    // TODO: check all request tests
    describe("canCreateOutgoingRequestItem", function () {
        test("returns success when proposing an Identity Attribute", function () {
            const recipientAddress = CoreAddress.from("recipientAddress");

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

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipientAddress);

            expect(result).successfulValidationResult();
        });

        test("returns success when proposing a Relationship Attribute", function () {
            const recipientAddress = CoreAddress.from("recipientAddress");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "A Title", value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: CoreAddress.from(""),
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipientAddress);

            expect(result).successfulValidationResult();
        });

        test("returns an error when passing anything other than an empty string as an owner into 'attribute'", function () {
            const recipientAddress = CoreAddress.from("recipientAddress");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "A Title", value: "AGivenName" }),
                    owner: recipientAddress
                }),
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: CoreAddress.from(""),
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipientAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        test("returns an error when passing anything other than an empty string as an owner into 'query'", function () {
            const recipientAddress = CoreAddress.from("recipientAddress");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "A Title", value: "AGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: recipientAddress,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipientAddress);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        describe("query", function () {
            describe("IdentityAttributeQuery", function () {
                test("simple query", function () {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
                        query: IdentityAttributeQuery.from({
                            valueType: "GivenName"
                        })
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipientAddress"));

                    expect(result).successfulValidationResult();
                });
            });

            describe("RelationshipAttributeQuery", function () {
                test("simple query", function () {
                    const query = RelationshipAttributeQuery.from({
                        owner: "",
                        key: "aKey",
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
                            value: ProprietaryString.fromAny({ title: "aTitle", value: "AGivenName" }),
                            owner: CoreAddress.from("")
                        })
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipientAddress"));

                    expect(result).successfulValidationResult();
                });
            });
        });
    });
    describe("canAccept", function () {
        test("returns success when called with the id of an existing own LocalAttribute", async function () {
            const senderAddress = CoreAddress.from("recipientAddress");
            const recipientAddress = accountController.identity.address;

            const existingLocalAttribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: recipientAddress
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
                peer: senderAddress,
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
                peer: CoreAddress.from("id1"),
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

        test("returns success when called with a the proposed Attribute", async function () {
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
                peer: CoreAddress.from("id1"),
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
                peer: CoreAddress.from("id1"),
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

        test("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
            const someOtherIdentity = CoreAddress.from("id1");

            const idOfAttributeOfOtherIdentity = await ConsumptionIds.attribute.generate();

            await consumptionController.attributes.createPeerLocalAttribute({
                id: idOfAttributeOfOtherIdentity,
                content: TestObjectFactory.createIdentityAttribute({
                    owner: someOtherIdentity
                }),
                peer: someOtherIdentity,
                requestReference: await ConsumptionIds.request.generate()
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
                peer: accountController.identity.address,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
                accept: true,
                attributeId: idOfAttributeOfOtherIdentity.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: /The given Attribute belongs to someone else. You can only share own Attributes./
            });
        });

        test("returns an error when the given Attribute's owner is not the current identity", async function () {
            const someOtherIdentity = CoreAddress.from("id1");

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
                peer: accountController.identity.address,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersJSON = {
                accept: true,
                attribute: TestObjectFactory.createIdentityAttribute({ owner: someOtherIdentity }).toJSON()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: /The given Attribute belongs to someone else. You can only share own Attributes./
            });
        });
    });

    describe("accept", function () {
        test("in case of a given attributeId of an own Local Attribute, creates a copy of the Local Attribute with the given id with share info for the peer of the Request", async function () {
            const attribute = await consumptionController.attributes.createLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from(accountController.identity.address)
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
                peer: CoreAddress.from("id1"),
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

        test("in case of accepting the proposed Attribute, creates the Local Attribute and a copy of the Local Attribute with the given id with share info for the peer of the Request", async function () {
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
                peer: CoreAddress.from("id1"),
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
        });

        test("in case of a given own IdentityAttribute, creates a new Repository Attribute as well as a copy of it for the peer", async function () {
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
                peer: CoreAddress.from("id1"),
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
                    owner: accountController.identity.address.toString(),
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

        test("in case of a given peer RelationshipAttribute, creates a new Local Attribute with share info for the peer of the Request - but no Repository Attribute", async function () {
            const senderAddress = accountController.identity.address;
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: senderAddress,
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
                peer: senderAddress,
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
                    owner: senderAddress.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
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
        });
    });
});
