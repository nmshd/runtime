import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
    GivenName,
    IdentityAttribute,
    IdentityAttributeQuery,
    IQLQuery,
    ProprietaryString,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { OwnIdentityAttribute } from "src/modules/attributes/local/attributeTypes/OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "src/modules/attributes/local/attributeTypes/OwnRelationshipAttribute";
import { PeerIdentityAttribute } from "src/modules/attributes/local/attributeTypes/PeerIdentityAttribute";
import { PeerRelationshipAttribute } from "src/modules/attributes/local/attributeTypes/PeerRelationshipAttribute";
import { ThirdPartyRelationshipAttribute } from "src/modules/attributes/local/attributeTypes/ThirdPartyRelationshipAttribute";
import { anything, reset, spy, when } from "ts-mockito";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    AttributeSucceededEvent,
    ConsumptionController,
    ConsumptionIds,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    LocalRequest,
    LocalRequestStatus,
    ReadAttributeRequestItemProcessor,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ValidationResult
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";

describe("ReadAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let processor: ReadAttributeRequestItemProcessor;

    let thirdPartyConsumptionController: ConsumptionController;
    let thirdPartyAccountController: AccountController;
    let aThirdParty: CoreAddress;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        ({ accountController, consumptionController } = accounts[0]);

        processor = new ReadAttributeRequestItemProcessor(consumptionController);

        ({ accountController: thirdPartyAccountController, consumptionController: thirdPartyConsumptionController } = accounts[1]);
        aThirdParty = thirdPartyAccountController.identity.address;
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        const recipient = CoreAddress.from("Recipient");
        let sender: CoreAddress;

        beforeAll(function () {
            sender = accountController.identity.address;
        });

        describe("IdentityAttributeQuery", function () {
            test("simple query", async () => {
                const query = IdentityAttributeQuery.from({
                    valueType: "GivenName"
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                expect(result).successfulValidationResult();
            });

            test("cannot query invalid tag", async () => {
                const query = IdentityAttributeQuery.from({
                    valueType: "GivenName",
                    tags: ["invalidTag"]
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "Detected invalidity of the following tags: 'invalidTag'."
                });
            });
        });

        describe("IQLQuery", function () {
            test("simple query", async () => {
                const query = IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                expect(result).successfulValidationResult();
            });

            test("cannot query invalid tag", async () => {
                const query = IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["invalidTag"] } });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "Detected invalidity of the following tags: 'invalidTag'."
                });
            });
        });

        describe("RelationshipAttributeQuery", function () {
            enum TestIdentity {
                Self,
                Recipient,
                Empty,
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
                    description: "query with owner=empty string, owner will become the Recipient later on",
                    input: {
                        owner: TestIdentity.Empty
                    },
                    expectedOutput: {
                        success: true
                    }
                },
                {
                    description: "cannot query with owner=Recipient",
                    input: {
                        owner: TestIdentity.Recipient
                    },
                    expectedOutput: {
                        errorCode: "error.consumption.requests.invalidRequestItem",
                        errorMessage:
                            "The owner of the given `query` can only be an empty string or yourself. This is because you can only request RelationshipAttributes using a ReadAttributeRequestitem with a RelationshipAttributeQuery where the Recipient of the Request or yourself is the owner. And in order to avoid mistakes, the Recipient automatically will become the owner of the RelationshipAttribute later on if the owner of the `query` is an empty string."
                    }
                },
                {
                    description: "cannot query with owner=thirdParty",
                    input: {
                        owner: TestIdentity.ThirdParty
                    },
                    expectedOutput: {
                        errorCode: "error.consumption.requests.invalidRequestItem",
                        errorMessage:
                            "The owner of the given `query` can only be an empty string or yourself. This is because you can only request RelationshipAttributes using a ReadAttributeRequestitem with a RelationshipAttributeQuery where the Recipient of the Request or yourself is the owner. And in order to avoid mistakes, the Recipient automatically will become the owner of the RelationshipAttribute later on if the owner of the `query` is an empty string."
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
                    description: "can query with thirdParty = empty string",
                    input: {
                        owner: TestIdentity.ThirdParty,
                        thirdParty: TestIdentity.Empty
                    },
                    expectedOutput: {
                        success: true
                    }
                },
                {
                    description: "cannot query with thirdParty = self",
                    input: {
                        owner: TestIdentity.Recipient,
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
            test.each(testParams)("$description", async (testParams: TestParams) => {
                function translateTestIdentityToAddress(testIdentity: TestIdentity) {
                    switch (testIdentity) {
                        case TestIdentity.Self:
                            return accountController.identity.address.toString();
                        case TestIdentity.Recipient:
                            return CoreAddress.from("recipient").toString();
                        case TestIdentity.Empty:
                            return CoreAddress.from("").toString();
                        case TestIdentity.OtherWithRelationship:
                            return CoreAddress.from("recipient").toString();
                        case TestIdentity.OtherWithoutRelationship:
                            return "someAddressWithoutRelationship";
                        case TestIdentity.ThirdParty:
                            return "thirdParty";
                        default:
                            throw new Error("Given TestIdentity does not exist");
                    }
                }

                let query: RelationshipAttributeQuery | ThirdPartyRelationshipAttributeQuery;
                if (testParams.input.thirdParty !== undefined) {
                    query = ThirdPartyRelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner) as any,
                        key: "aKey",
                        thirdParty: [translateTestIdentityToAddress(testParams.input.thirdParty)]
                    });
                } else {
                    query = RelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner),
                        key: "aKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    });
                }

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: query
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                if (testParams.expectedOutput.hasOwnProperty("success")) {
                    expect(result).successfulValidationResult();
                } else {
                    const error = testParams.expectedOutput as { errorCode?: string; errorMessage?: string };
                    expect(result).errorValidationResult({
                        code: error.errorCode,
                        message: error.errorMessage
                    });
                }
            });

            test("cannot query another RelationshipAttribute with same key", async function () {
                await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "uniqueKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: sender,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        key: "uniqueKey",
                        owner: sender,
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    })
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message:
                        "The creation of the queried RelationshipAttribute cannot be requested because there is already a RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
                });
            });

            test("can query a RelationshipAttribute with same key but different value type", async function () {
                await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "valueTypeSpecificUniqueKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: sender,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        key: "valueTypeSpecificUniqueKey",
                        owner: sender,
                        attributeCreationHints: {
                            valueType: "ProprietaryInteger",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    })
                });

                const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), recipient);

                expect(result).successfulValidationResult();
            });
        });
    });

    describe("canAccept", function () {
        const sender = CoreAddress.from("Sender");
        let recipient: CoreAddress;

        beforeAll(function () {
            recipient = accountController.identity.address;
        });

        beforeEach(async () => await TestUtil.ensureActiveRelationship(accountController, thirdPartyAccountController));

        test("can be called with the id of an existing own LocalAttribute", async function () {
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
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
                peer: sender,
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
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    tags: ["x:aTag"]
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("can be called with an existing RelationshipAttribute by a third party", async function () {
            const attribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: aThirdParty,
                    value: ProprietaryString.from({
                        title: "aTitle",
                        value: "aStringValue"
                    })
                }),
                peer: aThirdParty,
                sourceReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                    thirdParty: [aThirdParty.toString()]
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
                existingAttributeId: "non-existent-id"
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.transport.recordNotFound"
            });
        });

        test("returns an error when the attribute contains a forbidden character", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName😀"
                    },
                    tags: ["aTag"]
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "The Attribute contains forbidden characters."
            });
        });

        test("returns an error trying to share the predecessor of an already shared Attribute", async function () {
            const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
                })
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

            await consumptionController.attributes.addForwardedSharingDetailsToAttribute(successorOwnIdentityAttribute, sender, await CoreIdHelper.notPrefixed.generate());

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: predecessorOwnIdentityAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${successorOwnIdentityAttribute.id}' of it.`
            });
        });

        test("returns an error when the given Attribute has an invalid tag", async function () {
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

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

            const canAcceptWithExistingAttributeResult = await processor.canAccept(
                requestItem,
                {
                    accept: true,
                    existingAttributeId: existingAttribute.id.toString()
                },
                request
            );

            expect(canAcceptWithExistingAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });

            const canAcceptWithNewAttributeResult = await processor.canAccept(
                requestItem,
                {
                    accept: true,
                    newAttribute: TestObjectFactory.createIdentityAttribute({
                        value: GivenName.fromAny({ value: "anotherGivenName" }),
                        tags: ["invalidTag"],
                        owner: accountController.identity.address
                    }).toJSON()
                },
                request
            );

            expect(canAcceptWithNewAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });

        test("returns an error trying to answer with a new Attribute that doesn't fulfill the validation criteria", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "EMailAddress" })
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "IdentityAttribute",
                    owner: recipient.toString(),
                    value: {
                        "@type": "EMailAddress",
                        value: "invalid-email-address"
                    }
                }
            };

            await expect(processor.canAccept(requestItem, acceptParams, request)).rejects.toThrow(/EMailAddress.value :: Value does not match regular expression*/);
        });

        describe("canAccept ReadAttributeRequestitem with IdentityAttributeQuery", function () {
            test("returns an error when the given IdentityAttribute id belongs to a PeerIdentityAttribute", async function () {
                const peerAttributeId = await ConsumptionIds.attribute.generate();
                await consumptionController.attributes.createPeerIdentityAttribute({
                    id: peerAttributeId,
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: aThirdParty
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
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
                    existingAttributeId: peerAttributeId.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message:
                        "The selected Attribute is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. When accepting a ReadAttributeRequestItem with an existing Attribute it may only be such an Attribute."
                });
            });

            test("returns an error when a successor of the existing IdentityAttribute is already shared", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient
                    })
                });

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
                    content: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "AnotherGivenName"
                        }
                    }
                });

                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(successorOwnIdentityAttribute, sender, await ConsumptionIds.request.generate());

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: predecessorOwnIdentityAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: `The provided IdentityAttribute is outdated. You have already shared the successor '${successorOwnIdentityAttribute.id.toString()}' of it.`
                });
            });

            test("returns success responding with a new Attribute that has additional tags than those requested by the IdentityAttributeQuery", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aTag"], valueType: "GivenName" })
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        tags: ["x:aTag", "x:AnotherTag"],
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });

            test("returns success responding with an existing Attribute and specifying additional tags that are requested by the IdentityAttributeQuery", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:anExistingTag"]
                    })
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" })
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: ownIdentityAttribute.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with IQLQuery", function () {
            test("can be called with property tags used in the IQLQuery", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["x:tagA", "x:tagB", "x:tagC"] } })
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        tags: ["x:tagA", "x:tagD", "x:tagE"],
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with RelationshipAttributeQuery", function () {
            test("returns an error when a RelationshipAttribute was queried using a RelationshipAttributeQuery and the Recipient tries to respond with an existing RelationshipAttribute", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: recipient.toString(),
                        key: "aKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
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

                const localAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: sender,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
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
                        value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
                    }),
                    peer: sender,
                    sourceReference: CoreId.from("reqRef")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        key: "uniqueKey",
                        owner: recipient,
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

            test("returns an error if accepting would lead to the creation of another RelationshipAttribute with same key but rejecting of the ReadAttributeRequestItem would be permitted", async function () {
                await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        key: "anotherUniqueKey",
                        owner: recipient,
                        value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
                    }),
                    peer: sender,
                    sourceReference: CoreId.from("reqRef")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: false,
                    query: RelationshipAttributeQuery.from({
                        key: "anotherUniqueKey",
                        owner: recipient,
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "aTitle",
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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
                        "This ReadAttributeRequestItem cannot be accepted as the queried RelationshipAttribute cannot be created because there is already a RelationshipAttribute in the context of this Relationship with the same key 'anotherUniqueKey', owner and value type."
                });
            });

            test("can be called when a RelationshipAttribute of Value Type Consent is queried even though title and description is specified", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: sender.toString(),
                        key: "aKey",
                        attributeCreationHints: {
                            valueType: "Consent",
                            title: "aTitle",
                            description: "aDescription",
                            confidentiality: RelationshipAttributeConfidentiality.Private
                        }
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "RelationshipAttribute",
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Private,
                        owner: sender.toString(),
                        value: {
                            "@type": "Consent",
                            consent: "aConsent"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with ThirdPartyRelationshipAttributeQuery", function () {
            test("returns an error when trying to respond with a ThirdPartyRelationshipAttribute to a ThirdPartyRelationshipAttributeQuery", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const thirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: aThirdParty,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate(),
                    initialAttributePeer: CoreAddress.from("anotherThirdParty"),
                    id: CoreId.from("attributeId")
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: thirdPartyRelationshipAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message:
                        "The selected Attribute is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute. When accepting a ReadAttributeRequestItem with an existing Attribute it may only be such an Attribute."
                });
            });

            test("returns an error when a RelationshipAttribute is not shared with one of the third parties that were queried using a ThirdPartyRelationshipAttributeQuery", async function () {
                const anUninvolvedThirdParty = CoreAddress.from("AnUninvolvedThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const localAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: anUninvolvedThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: "The provided RelationshipAttribute exists in the context of a Relationship with a third party that should not be involved."
                });
            });

            test("returns an error when trying to share a RelationshipAttribute of a pending Relationship", async function () {
                await TestUtil.mutualDecomposeIfActiveRelationshipExists(accountController, consumptionController, thirdPartyAccountController, thirdPartyConsumptionController);
                await TestUtil.addPendingRelationship(accountController, thirdPartyAccountController);

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const localAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "cannotShareRelationshipAttributeOfPendingRelationship",
                    message: "The provided RelationshipAttribute exists in the context of a pending Relationship and therefore cannot be shared."
                });
            });

            test("returns an error trying to respond with tags", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const localAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString(),
                    tags: ["aTag"]
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "When responding to a ThirdPartyRelationshipAttributeQuery, no tags may be specified."
                });
            });

            test("returns an error when a RelationshipAttribute was queried using a ThirdPartyRelationshipAttributeQuery and the Recipient tries to respond with a new RelationshipAttribute", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "RelationshipAttribute",
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: aThirdParty.toString(),
                        value: {
                            "@type": "ProprietaryString",
                            title: "aTitle",
                            value: "aStringValue"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that already exist may be provided."
                });
            });

            test("can be called with an arbitrary third party if the thirdParty string array of the ThirdPartyRelationshipAttributeQuery contains an empty string", async function () {
                const aQueriedThirdParty = CoreAddress.from("aQueriedThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: "",
                        key: "aKey",
                        thirdParty: ["", aQueriedThirdParty.toString()]
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

                const localAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: aThirdParty,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });

            test("returns an error when the confidentiality of the existing RelationshipAttribute to be shared is private", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "aKey",
                        thirdParty: [aThirdParty.toString()]
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

                const localAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Private,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: "The confidentiality of the provided RelationshipAttribute is private. Therefore you are not allowed to share it."
                });
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
            test("accept with existing OwnIdentityAttribute", async function () {
                const attribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient
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
                    existingAttributeId: attribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const updatedAttribute = (await consumptionController.attributes.getLocalAttribute(attribute.id)) as OwnIdentityAttribute;
                expect(updatedAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedAttribute.forwardedSharingDetails![0].peer).toStrictEqual(incomingRequest.peer);
            });

            test("accept with existing OwnIdentityAttribute and new tags", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        tags: ["x:anExistingTag"]
                    })
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: ownIdentityAttribute.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const ownIdentityAttributeSuccessor = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(ownIdentityAttributeSuccessor!.succeeds).toStrictEqual(ownIdentityAttribute.id);
                expect((ownIdentityAttributeSuccessor!.content as IdentityAttribute).tags).toStrictEqual(["x:anExistingTag", "x:aNewTag"]);
                expect((ownIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((ownIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.succeededBy).toStrictEqual(ownIdentityAttributeSuccessor!.id);
            });

            test("accept with existing OwnIdentityAttribute whose predecessor was already shared", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: CoreAddress.from(accountController.identity.address)
                    })
                });

                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessorOwnIdentityAttribute, sender, CoreId.from("initialRequest"));

                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
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
                    existingAttributeId: successorOwnIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared and new tags", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:anExistingTag"]
                    })
                });

                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessor, sender, CoreId.from("initialRequest"));

                const { successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, {
                    content: IdentityAttribute.from({
                        owner: accountController.identity.address,
                        value: GivenName.fromAny({ value: "aNewGivenName" }),
                        tags: ["x:anExistingTag"]
                    })
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: successor.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const createdSuccessor = (await consumptionController.attributes.getLocalAttribute(
                    (result as AttributeSuccessionAcceptResponseItem).successorId
                )) as OwnIdentityAttribute;
                expect(createdSuccessor.succeeds).toStrictEqual(successor.id);
                expect(createdSuccessor.content.tags).toStrictEqual(["x:anExistingTag", "x:aNewTag"]);
                expect(createdSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(createdSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successor.id)) as OwnIdentityAttribute;
                expect(updatedSuccessor.succeededBy).toStrictEqual(createdSuccessor.id);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared but is DeletedByPeer", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessor, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(predecessor, deletionInfo, sender);

                const { successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "A succeeded given name"
                        },
                        owner: accountController.identity.address
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
                    existingAttributeId: successor.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(successor.id);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successor.id)) as OwnIdentityAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedSuccessor.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared but is ToBeDeletedByPeer", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessor, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(predecessor, deletionInfo, sender);

                const { successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "A succeeded given name"
                        },
                        owner: accountController.identity.address
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
                    existingAttributeId: successor.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).predecessorId).toStrictEqual(predecessor.id);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(successor.id);

                const updatedPredecessor = (await consumptionController.attributes.getLocalAttribute(predecessor.id)) as OwnIdentityAttribute;
                expect(updatedPredecessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedPredecessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedPredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.ToBeDeletedByPeer);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successor.id)) as OwnIdentityAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedSuccessor.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, CoreId.from("reqRef"));

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
                    existingAttributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version and new tags", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        tags: ["x:anExistingTag"]
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, CoreId.from("reqRef"));

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x:aNewTag", "x:anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: ownIdentityAttribute.id.toString(),
                    tags: ["x:aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const successorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(successorOwnIdentityAttribute!.succeeds).toStrictEqual(ownIdentityAttribute.id);
                expect((successorOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:anExistingTag", "x:aNewTag"]);
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version but is DeletedByPeer", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(ownIdentityAttribute, deletionInfo, sender);

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
                    existingAttributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(2);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe(EmittedAttributeDeletionStatus.DeletedByPeer);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].peer).toStrictEqual(sender);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![1].deletionInfo).toBeUndefined();
            });

            test("accept with existing IdentityAttribute that is already shared and the latest shared version but is ToBeDeletedByPeer", async function () {
                const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(ownIdentityAttribute, sender, CoreId.from("reqRef"));

                const deletionInfo = EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                });
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(ownIdentityAttribute, deletionInfo, sender);

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
                    existingAttributeId: ownIdentityAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
                expect((result as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(ownIdentityAttribute.id);

                const updatedOwnIdentityAttribute = (await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id)) as OwnIdentityAttribute;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo).toBeUndefined();
            });

            test("accept with existing OwnRelationshipAttribute that exists in the context of a Relationship with a third party", async function () {
                const peerAddress = CoreAddress.from("peerAddress");

                const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: accountController.identity.address
                    }),
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        key: "aKey",
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        thirdParty: [peerAddress.toString()]
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: ownRelationshipAttribute.id.toString()
                };
                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).thirdPartyAddress).toStrictEqual(peerAddress);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(ownRelationshipAttribute.id);

                const updatedOwnRelationshipAttribute = (await consumptionController.attributes.getLocalAttribute(ownRelationshipAttribute.id)) as OwnRelationshipAttribute;
                expect(updatedOwnRelationshipAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedOwnRelationshipAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing PeerRelationshipAttribute that exists in the context of a Relationship with a third party", async function () {
                const peerAddress = CoreAddress.from("peerAddress");

                const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: peerAddress
                    }),
                    peer: peerAddress,
                    sourceReference: CoreId.from("reqRef")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        key: "aKey",
                        owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                        thirdParty: [peerAddress.toString()]
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: peerRelationshipAttribute.id.toString()
                };
                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).thirdPartyAddress).toStrictEqual(peerAddress);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(peerRelationshipAttribute.id);

                const updatedPeerRelationshipAttribute = (await consumptionController.attributes.getLocalAttribute(peerRelationshipAttribute.id)) as PeerRelationshipAttribute;
                expect(updatedPeerRelationshipAttribute.forwardedSharingDetails).toHaveLength(1);
                expect(updatedPeerRelationshipAttribute.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing OwnRelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
                const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

                const predecessor = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: accountController.identity.address
                    }),
                    peer: thirdPartyAddress,
                    sourceReference: CoreId.from("reqRef")
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessor, sender, CoreId.from("initialRequest"));

                const { successor } = await consumptionController.attributes.succeedOwnRelationshipAttribute(predecessor, {
                    content: RelationshipAttribute.from({
                        value: {
                            "@type": "ProprietaryString",
                            title: "aNewTitle",
                            value: "aNewValue"
                        },
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        key: "aKey",
                        owner: accountController.identity.address
                    }),
                    sourceReference: CoreId.from("successionNotification")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        key: "aKey",
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        thirdParty: [thirdPartyAddress.toString()]
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: successor.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(successor.id);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successor.id)) as OwnRelationshipAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("accept with existing PeerRelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
                const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

                const predecessor = await consumptionController.attributes.createPeerRelationshipAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: thirdPartyAddress
                    }),
                    peer: thirdPartyAddress,
                    sourceReference: CoreId.from("reqRef")
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(predecessor, sender, CoreId.from("initialRequest"));

                const { successor } = await consumptionController.attributes.succeedPeerRelationshipAttribute(predecessor, {
                    content: RelationshipAttribute.from({
                        value: {
                            "@type": "ProprietaryString",
                            title: "aNewTitle",
                            value: "aNewValue"
                        },
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        key: "aKey",
                        owner: thirdPartyAddress
                    }),
                    sourceReference: CoreId.from("successionNotification"),
                    id: CoreId.from("attributeId")
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        key: "aKey",
                        owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                        thirdParty: [thirdPartyAddress.toString()]
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: successor.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);
                expect((result as AttributeSuccessionAcceptResponseItem).successorId).toStrictEqual(successor.id);

                const updatedSuccessor = (await consumptionController.attributes.getLocalAttribute(successor.id)) as PeerRelationshipAttribute;
                expect(updatedSuccessor.forwardedSharingDetails).toHaveLength(1);
                expect(updatedSuccessor.forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });
        });

        describe("accept with new Attribute", function () {
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
                    peer: sender,
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
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute instanceof OwnIdentityAttribute).toBe(true);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((createdAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);
            });

            test("trim the new IdentityAttribute", async function () {
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "    aGivenName  "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect((createdAttribute!.content.value as GivenName).value).toBe("aGivenName");
            });

            test("accept with new RelationshipAttribute", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "RelationshipAttribute",
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient.toString(),
                        value: {
                            "@type": "ProprietaryString",
                            title: "aTitle",
                            value: "aStringValue"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute).toBeDefined();
                expect(createdAttribute instanceof OwnRelationshipAttribute).toBe(true);
                expect((createdAttribute as OwnRelationshipAttribute).peerSharingDetails.peer).toStrictEqual(sender);
            });

            test("accept with new IdentityAttribute that is a duplicate", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
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
                    peer: sender,
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
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
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
                    peer: sender,
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
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
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
                    peer: sender,
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
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((createdAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);

                const updatedExistingOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id);
                expect(updatedExistingOwnIdentityAttribute!.succeededBy).toStrictEqual(createdAttribute!.id);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming with different tags", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x:tag1"]
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
                    peer: sender,
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
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: " aGivenName "
                        },
                        tags: ["x:tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((createdAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);

                const updatedExistingOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id);
                expect(updatedExistingOwnIdentityAttribute!.succeededBy).toStrictEqual(createdAttribute!.id);
            });

            test("accept with new IdentityAttribute that is already shared", async function () {
                const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" })
                    })
                });
                await consumptionController.attributes.addForwardedSharingDetailsToAttribute(existingOwnIdentityAttribute, sender, CoreId.from("reqRef"));

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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const successorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(successorOwnIdentityAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((successorOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);

                const updatedExistingOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id);
                expect(updatedExistingOwnIdentityAttribute!.succeededBy).toStrictEqual(successorOwnIdentityAttribute!.id);
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const successorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(successorOwnIdentityAttribute!.succeeds).toStrictEqual(existingOwnIdentityAttribute.id);
                expect((successorOwnIdentityAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);

                const updatedExistingOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttribute.id);
                expect(updatedExistingOwnIdentityAttribute!.succeededBy).toStrictEqual(successorOwnIdentityAttribute!.id);
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttribute.id);

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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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

                const createdSuccessor = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
                expect(createdSuccessor!.succeeds).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);
                expect((createdSuccessor!.content as IdentityAttribute).tags).toStrictEqual(["x:tag1", "x:tag2"]);
                expect((createdSuccessor as OwnIdentityAttribute).forwardedSharingDetails).toHaveLength(1);
                expect((createdSuccessor as OwnIdentityAttribute).forwardedSharingDetails![0].peer).toStrictEqual(sender);

                const updatedExistingOwnIdentityAttributeSuccessor = await consumptionController.attributes.getLocalAttribute(existingOwnIdentityAttributeSuccessor.id);
                expect(updatedExistingOwnIdentityAttributeSuccessor!.succeededBy).toStrictEqual(createdSuccessor!.id);
                expect((updatedExistingOwnIdentityAttributeSuccessor as OwnIdentityAttribute).forwardedSharingDetails).toBeUndefined();
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "IdentityAttribute",
                        owner: recipient.toString(),
                        value: {
                            "@type": "GivenName",
                            value: "aSucceededGivenName"
                        }
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).attributeId).toStrictEqual(existingOwnIdentityAttributeSuccessor.id);
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
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
        const recipient = CoreAddress.from("Recipient");

        test("creates a new PeerIdentityAttribute with the Attribute received in the ResponseItem", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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
            const attributeId = await ConsumptionIds.attribute.generate();

            const responseItem = ReadAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: attributeId,
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(attributeId);
            expect(createdAttribute instanceof PeerIdentityAttribute).toBe(true);
            expect((createdAttribute as PeerIdentityAttribute).peerSharingDetails.peer).toStrictEqual(recipient);
            expect((createdAttribute as PeerIdentityAttribute).peerSharingDetails.sourceReference).toStrictEqual(requestId);
        });

        test("succeeds an existing PeerIdentityAttribute with the Attribute received in the ResponseItem", async function () {
            const predecessorPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                }),
                peer: recipient,
                sourceReference: CoreId.from("oldReqRef"),
                id: await ConsumptionIds.attribute.generate()
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
            expect(successorPeerIdentityAttribute!.succeeds).toStrictEqual(predecessorPeerIdentityAttribute.id);

            const updatedPredecessorPeerIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorPeerIdentityAttribute.id);
            expect(updatedPredecessorPeerIdentityAttribute!.succeededBy).toStrictEqual(successorPeerIdentityAttribute!.id);
        });

        test("succeeds an existing PeerIdentityAttribute that is ToBeDeleted with the Attribute received in the ResponseItem", async function () {
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

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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

        test("succeeds an existing ThirdPartyRelationshipAttribute with the Attribute received in the ResponseItem", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

            const predecessorThirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                }),
                peer: recipient,
                sourceReference: CoreId.from("oldReqRef"),
                initialAttributePeer: thirdPartyAddress,
                id: await ConsumptionIds.attribute.generate()
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "aKey",
                    owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                    thirdParty: [thirdPartyAddress.toString()]
                })
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
                predecessorId: predecessorThirdPartyRelationshipAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress,
                    isTechnical: true
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const successorThirdPartyRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorThirdPartyRelationshipAttribute instanceof ThirdPartyRelationshipAttribute).toBe(true);
            expect((successorThirdPartyRelationshipAttribute as ThirdPartyRelationshipAttribute).peerSharingDetails.peer).toStrictEqual(recipient);
            expect((successorThirdPartyRelationshipAttribute as ThirdPartyRelationshipAttribute).peerSharingDetails.sourceReference).toStrictEqual(requestId);
            expect((successorThirdPartyRelationshipAttribute as ThirdPartyRelationshipAttribute).peerSharingDetails.initialAttributePeer).toStrictEqual(thirdPartyAddress);
            expect(successorThirdPartyRelationshipAttribute!.succeeds).toStrictEqual(predecessorThirdPartyRelationshipAttribute.id);

            const updatedPredecessorThirdPartyRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorThirdPartyRelationshipAttribute.id);
            expect(updatedPredecessorThirdPartyRelationshipAttribute!.succeededBy).toStrictEqual(successorThirdPartyRelationshipAttribute!.id);
        });

        test("removes deletionInfo of an existing PeerIdentityAttribute that is ToBeDeleted if it is shared again", async function () {
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

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
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
