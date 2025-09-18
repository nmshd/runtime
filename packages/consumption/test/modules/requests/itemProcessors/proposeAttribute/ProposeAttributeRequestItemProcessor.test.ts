import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    GivenName,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeRequestItem,
    ProprietaryInteger,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { OwnIdentityAttribute } from "src/modules/attributes/local/attributeTypes/OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "src/modules/attributes/local/attributeTypes/OwnRelationshipAttribute";
import { PeerIdentityAttribute } from "src/modules/attributes/local/attributeTypes/PeerIdentityAttribute";
import { anything, reset, spy, when } from "ts-mockito";
import {
    AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON,
    AttributeSucceededEvent,
    ConsumptionController,
    ConsumptionIds,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    LocalRequest,
    LocalRequestStatus,
    ProposeAttributeRequestItemProcessor,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ValidationResult
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
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        ({ accountController, consumptionController } = accounts[0]);

        processor = new ProposeAttributeRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        const recipient = CoreAddress.from("recipient");

        test("returns success when proposing an IdentityAttribute", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
            expect(result).successfulValidationResult();
        });

        test("returns an error when proposing an IdentityAttribute with invalid tag", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from(""),
                    tags: ["invalidTag"]
                }),
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });

        test("returns success when proposing a RelationshipAttribute", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "aTitle", value: "aGivenName" }),
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

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
            expect(result).successfulValidationResult();
        });

        test("returns an error when passing a forbidden character", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName😀" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The Attribute contains forbidden characters."
            });
        });

        test("returns an error when passing anything other than an empty string as an owner into 'attribute'", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "aTitle", value: "aGivenName" }),
                    owner: recipient
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

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
            expect(result).errorValidationResult({ code: "error.consumption.requests.invalidRequestItem" });
        });

        test("returns an error when passing anything other than an empty string as an owner into 'query'", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createRelationshipAttribute({
                    value: ProprietaryString.from({ title: "aTitle", value: "aGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: RelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: recipient,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
            expect(result).errorValidationResult({ code: "error.consumption.requests.invalidRequestItem" });
        });

        describe("query", function () {
            describe("IdentityAttributeQuery", function () {
                const recipient = CoreAddress.from("Recipient");

                test("simple query", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from("") }),
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).successfulValidationResult();
                });

                test("cannot query invalid tag", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from("") }),
                        query: IdentityAttributeQuery.from({
                            valueType: "GivenName",
                            tags: ["invalidTag"]
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: "Detected invalidity of the following tags: 'invalidTag'."
                    });
                });
            });

            describe("IQLQuery", function () {
                const recipient = CoreAddress.from("Recipient");

                test("simple query", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from("") }),
                        query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).successfulValidationResult();
                });

                test("cannot query invalid tag", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from("") }),
                        query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["invalidTag"] } })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: "Detected invalidity of the following tags: 'invalidTag'."
                    });
                });
            });

            describe("RelationshipAttributeQuery", function () {
                test("simple query", async () => {
                    const query = RelationshipAttributeQuery.from({
                        owner: "",
                        key: "aKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });

                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        query: query,
                        attribute: TestObjectFactory.createRelationshipAttribute({
                            value: ProprietaryString.fromAny({ title: "aTitle", value: "aStringValue" }),
                            owner: CoreAddress.from("")
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).successfulValidationResult();
                });

                test("returns an error when proposing another RelationshipAttribute with same key", async () => {
                    await consumptionController.attributes.createPeerRelationshipAttribute({
                        content: RelationshipAttribute.from({
                            key: "uniqueKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            owner: recipient,
                            value: ProprietaryString.from({
                                title: "aTitle",
                                value: "aStringValue"
                            })
                        }),
                        peer: recipient,
                        sourceReference: await ConsumptionIds.request.generate()
                    });

                    const query = RelationshipAttributeQuery.from({
                        owner: "",
                        key: "uniqueKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });

                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        query: query,
                        attribute: TestObjectFactory.createRelationshipAttribute({
                            value: ProprietaryString.fromAny({ title: "aTitle", value: "aStringValue" }),
                            owner: CoreAddress.from(""),
                            key: "uniqueKey"
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message:
                            "The creation of the proposed RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
                    });
                });

                test("returns success when proposing a RelationshipAttribute with same key but different value type", async () => {
                    await consumptionController.attributes.createPeerRelationshipAttribute({
                        content: RelationshipAttribute.from({
                            key: "valueTypeSpecificUniqueKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            owner: recipient,
                            value: ProprietaryString.from({
                                title: "aTitle",
                                value: "aStringValue"
                            })
                        }),
                        peer: recipient,
                        sourceReference: await ConsumptionIds.request.generate()
                    });

                    const query = RelationshipAttributeQuery.from({
                        owner: "",
                        key: "valueTypeSpecificUniqueKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryInteger",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });

                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        query: query,
                        attribute: TestObjectFactory.createRelationshipAttribute({
                            value: ProprietaryInteger.fromAny({ title: "aTitle", value: 1 }),
                            owner: CoreAddress.from(""),
                            key: "valueTypeSpecificUniqueKey"
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);
                    expect(result).successfulValidationResult();
                });
            });
        });
    });

    describe("canAccept", function () {
        const sender = CoreAddress.from("Sender");
        let recipient: CoreAddress;

        beforeAll(() => (recipient = accountController.identity.address));

        test("returns success when called with the id of an existing OwnIdentityAttribute", async function () {
            const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: recipient })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: existingOwnIdentityAttribute.id.toString()
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
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    }
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).successfulValidationResult();
        });

        test("returns success when called with the proposed Attribute", async function () {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "aGivenName" }),
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
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: requestItem.attribute.toJSON()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).successfulValidationResult();
        });

        test("returns an error when the Attribute contains a forbidden character", async function () {
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
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName😀"
                    }
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "The Attribute contains forbidden characters."
            });
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
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: "non-existent-id"
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).errorValidationResult({ code: "error.transport.recordNotFound" });
        });

        test("returns an error when a successor of the existing IdentityAttribute is already shared", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: recipient })
            });

            const { successor: ownIdentityAttributeSuccessor } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });
            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttributeSuccessor, sender, await ConsumptionIds.request.generate());

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from("") })
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: ownIdentityAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${ownIdentityAttributeSuccessor.id.toString()}' of it.`
            });
        });

        test("returns an error when a RelationshipAttribute was queried and the recipient tries to respond with an existing RelationshipAttribute", async function () {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: recipient.toString(),
                    key: "aKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                }),
                attribute: RelationshipAttribute.from({
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient,
                    value: ProprietaryString.from({
                        title: "aTitle",
                        value: "aStringValue"
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
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const existingRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient,
                    value: ProprietaryString.from({
                        title: "aTitle",
                        value: "AnotherStringValue"
                    })
                }),
                peer: sender,
                sourceReference: await ConsumptionIds.request.generate()
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: existingRelationshipAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided."
            });
        });

        test("throws an error when another RelationshipAttribute with same key was queried", async function () {
            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    key: "uniqueKey",
                    owner: recipient,
                    value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" })
                }),
                peer: sender,
                sourceReference: CoreId.from("reqRef")
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    key: "uniqueKey",
                    owner: "",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                }),
                attribute: RelationshipAttribute.from({
                    key: "uniqueKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: CoreAddress.from(""),
                    value: ProprietaryString.from({
                        title: "aTitle",
                        value: "aStringValue"
                    })
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "RelationshipAttribute",
                    key: "uniqueKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
                    }
                }
            };

            await expect(processor.canAccept(requestItem, acceptParams, incomingRequest)).rejects.toThrow(
                "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type.'"
            );
        });

        test("returns an error if accepting would lead to the creation of another RelationshipAttribute with same key but rejecting of the ProposeAttributeRequestItem would be permitted", async function () {
            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    key: "anotherUniqueKey",
                    owner: recipient,
                    value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" })
                }),
                peer: sender,
                sourceReference: CoreId.from("reqRef")
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                query: RelationshipAttributeQuery.from({
                    key: "anotherUniqueKey",
                    owner: "",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                }),
                attribute: RelationshipAttribute.from({
                    key: "anotherUniqueKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: CoreAddress.from(""),
                    value: ProprietaryString.from({
                        title: "aTitle",
                        value: "aStringValue"
                    })
                })
            });
            const requestId = await ConsumptionIds.request.generate();
            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                attribute: {
                    "@type": "RelationshipAttribute",
                    key: "anotherUniqueKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
                    }
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, incomingRequest);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message:
                    "This ProposeAttributeRequestItem cannot be accepted as the queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'anotherUniqueKey', owner and value type."
            });
        });

        test("returns an error trying to share the predecessor of an already shared Attribute", async function () {
            const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: accountController.identity.address })
            });

            const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "A new given name"
                    },
                    owner: accountController.identity.address
                })
            });
            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(successorOwnIdentityAttribute, sender, await ConsumptionIds.request.generate());

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
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                attributeId: predecessorOwnIdentityAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);
            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${successorOwnIdentityAttribute.id}' of it.`
            });
        });

        test("returns an error if accepting would accept an Attribute with an invalid tag", async function () {
            const attributesControllerSpy = spy(consumptionController.attributes);
            when(attributesControllerSpy.validateTagsOfAttribute(anything())).thenResolve(ValidationResult.success());

            const existingAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    tags: ["invalidTag"],
                    owner: accountController.identity.address
                })
            });

            reset(attributesControllerSpy);

            const sender = CoreAddress.from("Sender");
            const newAttribute = TestObjectFactory.createIdentityAttribute({
                tags: ["invalidTag"],
                owner: accountController.identity.address
            });

            const proposeAttributeRequestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                attribute: newAttribute
            });

            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ id: requestId, items: [proposeAttributeRequestItem] }),
                statusLog: []
            });

            const canAcceptWithNewAttributeResult = await processor.canAccept(proposeAttributeRequestItem, { accept: true, attribute: newAttribute.toJSON() }, request);

            expect(canAcceptWithNewAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });

            const canAcceptWithExistingAttributeResult = await processor.canAccept(
                proposeAttributeRequestItem,
                { accept: true, attributeId: existingAttribute.id.toString() },
                request
            );

            expect(canAcceptWithExistingAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });
    });

    describe("accept", function () {
        const sender = CoreAddress.from("Sender");
        let recipient: CoreAddress;

        beforeAll(() => (recipient = accountController.identity.address));

        describe("accept with existing Attribute", function () {
            test("accept with existing OwnIdentityAttribute", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: recipient })
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: accountController.identity.address })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessorOwnIdentityAttribute, sender, CoreId.from("initialRequest"));

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "aNewGivenName"
                        },
                        owner: accountController.identity.address
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: successorOwnIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(predecessorOwnIdentityAttribute.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(successorOwnIdentityAttribute.id);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared and new tags", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:anExistingTag"]
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessorOwnIdentityAttribute, sender, CoreId.from("initialRequest"));

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                    content: IdentityAttribute.from({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aNewGivenName" }),
                        tags: ["x:anExistingTag"]
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        owner: CoreAddress.from(""),
                        tags: ["x:aNewTag", "x:anotherNewTag"]
                    })
                });
                const requestId = await ConsumptionIds.request.generate();
                const incomingRequest = LocalRequest.from({
                    id: requestId,
                    createdAt: CoreDate.utc(),
                    isOwn: false,
                    peer: sender,
                    status: LocalRequestStatus.DecisionRequired,
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: successorOwnIdentityAttribute.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(predecessorOwnIdentityAttribute.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).not.toStrictEqual(successorOwnIdentityAttribute.id);

                const createdSuccessor = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(createdSuccessor!.succeeds).toStrictEqual(successorOwnIdentityAttribute.id);
                expect((createdSuccessor!.content as IdentityAttribute).tags).toStrictEqual(["x:anExistingTag", "x:aNewTag"]);
                expect((createdSuccessor as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((createdSuccessor as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);

                const updatedSuccessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id);
                expect(updatedSuccessorOwnIdentityAttribute!.succeededBy).toStrictEqual(createdSuccessor!.id);
                expect((updatedSuccessorOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails).toBeUndefined();
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared but is DeletedByPeer", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: accountController.identity.address })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessorOwnIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(predecessorOwnIdentityAttribute, deletionInfo, sender);

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "A succeeded given name"
                        },
                        owner: accountController.identity.address
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: successorOwnIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(successorOwnIdentityAttribute.id);

                const updatedSuccessorOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedSuccessorOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessorOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedSuccessorOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared but is ToBeDeletedByPeer", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from(accountController.identity.address) })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessorOwnIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(predecessorOwnIdentityAttribute, deletionInfo, sender);

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "A succeeded given name"
                        },
                        owner: CoreAddress.from(accountController.identity.address)
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: successorOwnIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(predecessorOwnIdentityAttribute.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(successorOwnIdentityAttribute.id);

                const updatedPredecessor = (await consumptionController.attributes.getLocalAttribute(predecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedPredecessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedPredecessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.ToBeDeletedByPeer);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedSuccessor.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version", async function () {
                const alreadySharedAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: accountController.identity.address })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(alreadySharedAttribute, sender, await ConsumptionIds.request.generate());

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: alreadySharedAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(alreadySharedAttribute.id);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version and new tags", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        tags: ["x:anExistingTag"]
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        owner: CoreAddress.from(""),
                        tags: ["x:aNewTag", "x:anotherNewTag"]
                    })
                });
                const requestId = await ConsumptionIds.request.generate();
                const incomingRequest = LocalRequest.from({
                    id: requestId,
                    createdAt: CoreDate.utc(),
                    isOwn: false,
                    peer: sender,
                    status: LocalRequestStatus.DecisionRequired,
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: ownIdentityAttribute.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(ownIdentityAttribute.id);

                const successorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(successorOwnIdentityAttribute!.succeeds).toStrictEqual(ownIdentityAttribute.id);
                expect((successorOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:anExistingTag", "x:aNewTag"]);
                expect((successorOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((successorOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version but is DeletedByPeer", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: accountController.identity.address })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(ownIdentityAttribute, deletionInfo, sender);

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(2);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe(EmittedAttributeDeletionStatus.DeletedByPeer);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version but is ToBeDeletedByPeer", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({ owner: CoreAddress.from(accountController.identity.address) })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(ownIdentityAttribute, deletionInfo, sender);
                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.id).toStrictEqual(ownIdentityAttribute.id);
                expect(updatedOwnIdentityAttribute.content).toStrictEqual(ownIdentityAttribute.content);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });
        });

        describe("accept with new Attribute", function () {
            test("accept proposed IdentityAttribute", async function () {
                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: requestItem.attribute.toJSON()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute).toBeInstanceOf(OwnIdentityAttribute);
                expect(createdAttribute!.content.owner).toStrictEqual(recipient);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with new IdentityAttribute", async function () {
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute).toBeInstanceOf(OwnIdentityAttribute);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect((createdAttribute!.content.value as GivenName).value).toBe("aGivenName");
            });

            test("in case of accepting with a new IdentityAttribute, trim the newly created Attribute", async function () {
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "    aGivenName  "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect((createdAttribute!.content.value as GivenName).value).toBe("aGivenName");
            });

            test("accept with new RelationshipAttribute", async function () {
                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        key: "aKey",
                        owner: "",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "RelationshipAttribute",
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: "",
                        value: {
                            "@type": "ProprietaryString",
                            title: "aTitle",
                            value: "aStringValue"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);

                expect(createdAttribute).toBeInstanceOf(OwnRelationshipAttribute);
                expect((createdAttribute as OwnRelationshipAttribute).peerSharingDetails.peer).toStrictEqual(sender);
                expect((createdAttribute as OwnRelationshipAttribute).peerSharingDetails.sourceReference).toStrictEqual(requestId);
                expect((createdAttribute as OwnRelationshipAttribute).forwardedSharingDetails).toBeUndefined();
            });

            test("accept with new IdentityAttribute that is a duplicate", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((createdAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((createdAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
            });

            test("accept with new IdentityAttribute that is already shared", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is already shared after trimming", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is already shared with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnIdentityAttribute.id);

                const succeededOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(succeededOwnIdentityAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((succeededOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
            });

            test("accept with new IdentityAttribute that is already shared after trimming with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnIdentityAttribute.id);

                const succeededOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(succeededOwnIdentityAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((succeededOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
            });

            test("accept with new IdentityAttribute that is already shared but DeletedByPeer", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(existingOwnIdentityAttribute, deletionInfo, sender);

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(2);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe(EmittedAttributeDeletionStatus.DeletedByPeer);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].deletionInfo).toBeUndefined();
            });

            test("accept with new IdentityAttribute that is already shared but ToBeDeletedByPeer", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(existingOwnIdentityAttribute, deletionInfo, sender);

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with new IdentityAttribute whose predecessor is already shared", async function () {
                const existingOwnIdentityAttributePredecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttributePredecessor, sender, CoreId.from("reqRef"));

                const existingOwnIdentityAttributeSuccessor = (
                    await consumptionController.attributes.succeedOwnIdentityAttribute(existingOwnIdentityAttributePredecessor, {
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "aSucceededGivenName" }),
                            owner: recipient
                        })
                    })
                ).successor;

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aSucceededGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnIdentityAttributePredecessor.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);

                const updatedSucceededOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttributeSuccessor.id);
                expect((updatedSucceededOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((updatedSucceededOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with new IdentityAttribute whose predecessor is already shared with different tags", async function () {
                const existingOwnIdentityAttributePredecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttributePredecessor, sender, CoreId.from("reqRef"));

                const existingOwnIdentityAttributeSuccessor = (
                    await consumptionController.attributes.succeedOwnIdentityAttribute(existingOwnIdentityAttributePredecessor, {
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "aSucceededGivenName" }),
                            owner: recipient,
                            tags: ["x:tag1"]
                        })
                    })
                ).successor;

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    content: Request.from({ id: requestId, items: [requestItem] }),
                    statusLog: []
                });

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aSucceededGivenName"
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnIdentityAttributePredecessor.id);

                const sharedSuccessor = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(sharedSuccessor!.succeeds).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);
                expect((sharedSuccessor!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
            });

            test("accept with new IdentityAttribute whose predecessor is already shared but DeletedByPeer", async function () {
                const existingOwnIdentityAttributePredecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttributePredecessor, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(existingOwnIdentityAttributePredecessor, deletionInfo, sender);

                const existingOwnIdentityAttributeSuccessor = (
                    await consumptionController.attributes.succeedOwnIdentityAttribute(existingOwnIdentityAttributePredecessor, {
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "aSucceededGivenName" }),
                            owner: recipient
                        })
                    })
                ).successor;

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aSucceededGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);
                expect((result as ProposeAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);
            });

            test("accept with new IdentityAttribute whose predecessor is already shared but ToBeDeletedByPeer", async function () {
                const existingOwnIdentityAttributePredecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttributePredecessor, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(existingOwnIdentityAttributePredecessor, deletionInfo, sender);

                const existingOwnIdentityAttributeSuccessor = (
                    await consumptionController.attributes.succeedOwnIdentityAttribute(existingOwnIdentityAttributePredecessor, {
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "aSucceededGivenName" }),
                            owner: recipient
                        })
                    })
                ).successor;

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
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
                    attribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aSucceededGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnIdentityAttributePredecessor.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);

                const updatedOwnIdentityAttributeSuccessor = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttributeSuccessor.id);
                expect((updatedOwnIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((updatedOwnIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect((updatedOwnIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates a new PeerIdentityAttribute with the Attribute received in the ResponseItem", async function () {
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
                content: Request.from({ id: requestId, items: [requestItem] }),
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
            expect(createdAttribute).toBeInstanceOf(PeerIdentityAttribute);
            expect((createdAttribute as PeerIdentityAttribute).peerSharingDetails.peer).toStrictEqual(peer);
            expect((createdAttribute as PeerIdentityAttribute).peerSharingDetails.sourceReference).toStrictEqual(requestId);
        });

        test("succeeds an existing PeerIdentityAttribute with the Attribute received in the ResponseItem", async function () {
            const sender = CoreAddress.from("Sender");

            const predecessorIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                peer: sender,
                sourceReference: CoreId.from("oldReqRef"),
                id: CoreId.from("attributeId")
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
                content: Request.from({ id: requestId, items: [requestItem] }),
                statusLog: []
            });

            const successorId = await ConsumptionIds.attribute.generate();
            const responseItem = AttributeSuccessionAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                predecessorId: predecessorIdentityAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createIdentityAttribute({ owner: sender, tags: ["x:aNewTag"] })
            });

            const event = await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            expect(event).toBeInstanceOf(AttributeSucceededEvent);

            const successorPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPeerIdentityAttribute).toBeInstanceOf(PeerIdentityAttribute);
            expect((successorPeerIdentityAttribute as PeerIdentityAttribute).peerSharingDetails.peer).toStrictEqual(sender);
            expect(successorPeerIdentityAttribute!.succeeds).toStrictEqual(predecessorIdentityAttribute.id);

            const updatedPredecessorPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorIdentityAttribute.id);
            expect(updatedPredecessorPeerIdentityAttribute!.succeededBy).toStrictEqual(successorPeerIdentityAttribute!.id);
        });

        test("succeeds an existing PeerIdentityAttribute that is ToBeDeleted with the Attribute received in the ResponseItem", async function () {
            const recipient = CoreAddress.from("Recipient");

            const predecessorPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                }),
                peer: recipient,
                sourceReference: CoreId.from("oldReqRef"),
                id: await ConsumptionIds.attribute.generate()
            });

            const deletionInfo = ReceivedAttributeDeletionInfo.from({
                deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                deletionDate: CoreDate.utc().add({ days: 1 })
            });
            await consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(predecessorPeerIdentityAttribute, deletionInfo);

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
                peer: recipient,
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
                predecessorId: predecessorPeerIdentityAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createIdentityAttribute({
                    owner: recipient,
                    tags: ["x:aNewTag"]
                })
            });

            const event = await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);
            expect(event).toBeInstanceOf(AttributeSucceededEvent);

            const successorPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect((successorPeerIdentityAttribute as PeerIdentityAttribute).peerSharingDetails.peer).toStrictEqual(recipient);
            expect((successorPeerIdentityAttribute as PeerIdentityAttribute).peerSharingDetails.deletionInfo).toBeUndefined();
            expect(successorPeerIdentityAttribute!.succeeds).toStrictEqual(predecessorPeerIdentityAttribute.id);

            const updatedPredecessorPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorPeerIdentityAttribute.id);
            expect(updatedPredecessorPeerIdentityAttribute!.succeededBy).toStrictEqual(successorPeerIdentityAttribute!.id);
            expect((updatedPredecessorPeerIdentityAttribute as PeerIdentityAttribute).peerSharingDetails.deletionInfo).toStrictEqual(deletionInfo);
        });

        test("removes deletionInfo of an existing PeerIdentityAttribute that is ToBeDeleted if it is shared again", async function () {
            const recipient = CoreAddress.from("Recipient");

            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                }),
                peer: recipient,
                sourceReference: CoreId.from("oldReqRef"),
                id: await ConsumptionIds.attribute.generate()
            });

            const deletionInfo = ReceivedAttributeDeletionInfo.from({
                deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                deletionDate: CoreDate.utc().add({ days: 1 })
            });
            await consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(existingPeerIdentityAttribute, deletionInfo);

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
                peer: recipient,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const responseItem = AttributeAlreadySharedAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: existingPeerIdentityAttribute.id
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const updatedExistingPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingPeerIdentityAttribute.id);
            expect((updatedExistingPeerIdentityAttribute as PeerIdentityAttribute).peerSharingDetails.deletionInfo).toBeUndefined();
        });
    });
});
