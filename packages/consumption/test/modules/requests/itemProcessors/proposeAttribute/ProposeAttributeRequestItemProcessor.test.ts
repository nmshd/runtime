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
import { CoreAddress, CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { anything, reset, spy, when } from "ts-mockito";
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
    ProposeAttributeRequestItemProcessor,
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

        test("returns success when proposing an Identity Attribute", async () => {
            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("")
                }),
                query: IdentityAttributeQuery.from({
                    valueType: "GivenName"
                })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when proposing an Identity Attribute with invalid tag", async () => {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from(""),
                    tags: ["invalidTag"]
                }),
                query: IdentityAttributeQuery.from({
                    valueType: "GivenName"
                })
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });

        test("returns success when proposing a Relationship Attribute", async () => {
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

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
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

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem"
            });
        });

        describe("query", function () {
            describe("IdentityAttributeQuery", function () {
                const recipient = CoreAddress.from("Recipient");

                test("simple query", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
                        query: IdentityAttributeQuery.from({
                            valueType: "GivenName"
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                    expect(result).successfulValidationResult();
                });

                test("cannot query invalid tag", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
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
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
                        query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                    expect(result).successfulValidationResult();
                });

                test("cannot query invalid tag", async () => {
                    const requestItem = ProposeAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("")
                        }),
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
                            value: ProprietaryString.fromAny({ title: "aTitle", value: "aGivenName" }),
                            owner: CoreAddress.from("")
                        })
                    });

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when proposing another RelationshipAttribute with same key", async () => {
                    await consumptionController.attributes.createSharedLocalAttribute({
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
                        requestReference: await ConsumptionIds.request.generate()
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
                    await consumptionController.attributes.createSharedLocalAttribute({
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
                        requestReference: await ConsumptionIds.request.generate()
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

        beforeAll(function () {
            recipient = accountController.identity.address;
        });

        test("returns success when called with the id of an existing own LocalAttribute", async function () {
            const existingLocalAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            const requestItem = ProposeAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: TestObjectFactory.createIdentityAttribute({
                    value: GivenName.fromAny({ value: "aGivenName" }),
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
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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

        test("throws an error when another RelationshipAttribute with same key was queried", async function () {
            await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    key: "uniqueKey",
                    owner: recipient,
                    value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" })
                }),
                peer: sender,
                requestReference: CoreId.from("reqRef")
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
            await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    key: "anotherUniqueKey",
                    owner: recipient,
                    value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" })
                }),
                peer: sender,
                requestReference: CoreId.from("reqRef")
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

        test("returns an error if accepting would accept an Attribute with an invalid tag", async function () {
            const attributesControllerSpy = spy(consumptionController.attributes);
            when(attributesControllerSpy.validateTagsOfAttribute(anything())).thenResolve(ValidationResult.success());

            const existingAttribute = await consumptionController.attributes.createRepositoryAttribute({
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
                content: Request.from({
                    id: requestId,
                    items: [proposeAttributeRequestItem]
                }),
                statusLog: []
            });

            const canAcceptWithNewAttributeResult = await processor.canAccept(
                proposeAttributeRequestItem,
                {
                    accept: true,
                    attribute: newAttribute.toJSON()
                },
                request
            );

            expect(canAcceptWithNewAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });

            const canAcceptWithExistingAttributeResult = await processor.canAccept(
                proposeAttributeRequestItem,
                {
                    accept: true,
                    attributeId: existingAttribute.id.toString()
                },
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

        beforeAll(function () {
            recipient = accountController.identity.address;
        });

        describe("accept with existing Attribute", function () {
            test("accept with existing RepositoryAttribute", async function () {
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

            test("accept with existing IdentityAttribute whose predecessor was already shared", async function () {
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

            test("accept with existing IdentityAttribute whose predecessor was already shared and new tags", async function () {
                const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+anExistingTag"]
                    })
                });

                await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepositoryAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("initialRequest")
                });

                const { successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                    content: IdentityAttribute.from({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aNewGivenName" }),
                        tags: ["x+%+anExistingTag"]
                    })
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        owner: CoreAddress.from(""),
                        tags: ["x+%+aNewTag", "x+%+anotherNewTag"]
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
                    attributeId: successorRepositoryAttribute.id.toString(),
                    tags: ["x+%+aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const successorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(successorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(successorRepositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+anExistingTag", "x+%+aNewTag"]);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared but is DeletedByPeer", async function () {
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

                const acceptParams: AcceptProposeAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    attributeId: repositoryAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(alreadySharedAttribute.id);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version and new tags", async function () {
                const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        tags: ["x+%+anExistingTag"]
                    })
                });

                await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: repositoryAttribute.id,
                    peer: sender,
                    requestReference: await CoreIdHelper.notPrefixed.generate()
                });

                const requestItem = ProposeAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" }),
                    attribute: IdentityAttribute.from({
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        owner: CoreAddress.from(""),
                        tags: ["x+%+aNewTag", "x+%+anotherNewTag"]
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
                    attributeId: repositoryAttribute.id.toString(),
                    tags: ["x+%+aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const successorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(successorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(repositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+anExistingTag", "x+%+aNewTag"]);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version but is DeletedByPeer", async function () {
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
                            value: "aGivenName"
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

            test("in case of accepting with a new IdentityAttribute, trim the newly created RepositoryAttribute as well as the copy for the Recipient", async function () {
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
                            value: "    aGivenName  "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdSharedAttribute).toBeDefined();
                expect((createdSharedAttribute!.content.value as GivenName).value).toBe("aGivenName");

                const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
                expect(createdRepositoryAttribute).toBeDefined();
                expect((createdRepositoryAttribute!.content.value as GivenName).value).toBe("aGivenName");
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
                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);

                expect(createdSharedAttribute).toBeDefined();
                expect(createdSharedAttribute!.shareInfo).toBeDefined();
                expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
                expect(createdSharedAttribute!.content.owner.toString()).toStrictEqual(recipient.toString());
            });

            test("accept with new IdentityAttribute that is a duplicate", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
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

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toStrictEqual(existingRepositoryAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
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

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toStrictEqual(existingRepositoryAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate with different tags", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+tag1"]
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(existingRepositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming with different tags", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+tag1"]
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ProposeAttributeAcceptResponseItem);

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ProposeAttributeAcceptResponseItem).attributeId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(existingRepositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
            });

            test("accept with new IdentityAttribute that is already shared", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const existingOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingOwnSharedIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is already shared after trimming", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const existingOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingOwnSharedIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is already shared with different tags", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+tag1"]
                    })
                });

                const existingOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnSharedIdentityAttribute.id);

                const succeededOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(succeededOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(existingRepositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
            });

            test("accept with new IdentityAttribute that is already shared after trimming with different tags", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+tag1"]
                    })
                });

                const existingOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnSharedIdentityAttribute.id);

                const succeededOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(succeededOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(existingRepositoryAttribute.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
            });

            test("accept with new IdentityAttribute whose predecessor is already shared", async function () {
                const existingRepositoryAttributePredecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const existingOwnSharedIdentityAttributePredecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttributePredecessor.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
                });

                const existingRepositoryAttributeSuccessor = (
                    await consumptionController.attributes.succeedRepositoryAttribute(existingRepositoryAttributePredecessor.id, {
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
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnSharedIdentityAttributePredecessor.id);

                const succeededOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(succeededOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toStrictEqual(existingRepositoryAttributeSuccessor.id);
            });

            test("accept with new IdentityAttribute whose predecessor is already shared with different tags", async function () {
                const existingRepositoryAttributePredecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });

                const existingOwnSharedIdentityAttributePredecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: existingRepositoryAttributePredecessor.id,
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
                });

                const existingRepositoryAttributeSuccessor = (
                    await consumptionController.attributes.succeedRepositoryAttribute(existingRepositoryAttributePredecessor.id, {
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "aSucceededGivenName" }),
                            owner: recipient,
                            tags: ["x+%+tag1"]
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(existingOwnSharedIdentityAttributePredecessor.id);

                const succeededOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(succeededOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toStrictEqual(existingRepositoryAttributeSuccessor.id);
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
            });
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
                    owner: sender,
                    tags: ["x+%+aNewTag"]
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
