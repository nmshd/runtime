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
import { anything, reset, spy, when } from "ts-mockito";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalAttributeDeletionInfo,
    LocalAttributeDeletionStatus,
    LocalAttributeShareInfo,
    LocalRequest,
    LocalRequestStatus,
    PeerSharedAttributeSucceededEvent,
    ReadAttributeRequestItemProcessor,
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

            test("cannot query another RelationshipAttribute with same key", async function () {
                await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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
                await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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
            const attribute = await consumptionController.attributes.createRepositoryAttribute({
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
                    tags: ["x+%+aTag"]
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("can be called with an existing RelationshipAttribute by a third party", async function () {
            const attribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: await ConsumptionIds.request.generate()
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
                existingAttributeId: predecessorRepositoryAttribute.id.toString()
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${successorRepositoryAttribute.id}' of it.`
            });
        });

        test("returns an error when the given Attribute has an invalid tag", async function () {
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

        describe("canAccept ReadAttributeRequestitem with IdentityAttributeQuery", function () {
            test("returns an error when the existing IdentityAttribute is already shared", async function () {
                const attribute = await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient
                    }),
                    peer: sender,
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
                    existingAttributeId: repositoryAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: `The provided IdentityAttribute is outdated. You have already shared the successor '${ownSharedCopyOfSuccessor.shareInfo?.sourceAttribute?.toString()}' of it.`
                });
            });

            test("returns success responding with a new Attribute that has additional tags than those requested by the IdentityAttributeQuery", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aTag"], valueType: "GivenName" })
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
                        tags: ["x+%+aTag", "x+%+AnotherTag"],
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
                const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: recipient,
                        value: GivenName.fromAny({ value: "aGivenName" }),
                        tags: ["x+%+anExistingTag"]
                    })
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: repositoryAttribute.id.toString(),
                    tags: ["x+%+aNewTag"]
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with IQLQuery", function () {
            test("can be called with property tags used in the IQLQuery", async function () {
                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["x+%+tagA", "x+%+tagB", "x+%+tagC"] } })
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
                        tags: ["x+%+tagA", "x+%+tagD", "x+%+tagE"],
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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
                await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        key: "uniqueKey",
                        owner: recipient,
                        value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
                    }),
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
                await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        key: "anotherUniqueKey",
                        owner: recipient,
                        value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue" })
                    }),
                    peer: sender,
                    requestReference: CoreId.from("reqRef")
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
            test("returns an error when a RelationshipAttribute is a copy of a sourceAttribute that was queried using a ThirdPartyRelationshipAttributeQuery", async function () {
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

                const localAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: RelationshipAttribute.from({
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "aTitle",
                            value: "aStringValue"
                        })
                    }),
                    shareInfo: {
                        peer: aThirdParty,
                        requestReference: await ConsumptionIds.request.generate(),
                        sourceAttribute: CoreId.from("sourceAttributeId"),
                        thirdPartyAddress: CoreAddress.from("aThirdParty")
                    }
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: "When responding to a ThirdPartyRelationshipAttributeQuery, only RelationshipAttributes that are not a copy of a sourceAttribute may be provided."
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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

                const localAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: await ConsumptionIds.request.generate()
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
            test("accept with existing RepositoryAttribute", async function () {
                const attribute = await consumptionController.attributes.createRepositoryAttribute({
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

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute).toBeDefined();
                expect(createdAttribute!.shareInfo).toBeDefined();
                expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            });

            test("accept with existing RepositoryAttribute and new tags", async function () {
                const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: accountController.identity.address,
                        tags: ["x+%+anExistingTag"]
                    })
                });

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: repositoryAttribute.id.toString(),
                    tags: ["x+%+aNewTag"]
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const ownSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                const sourceAttribute = await consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute!.shareInfo!.sourceAttribute!);
                expect(sourceAttribute!.succeeds).toBeDefined();
                expect((sourceAttribute!.content as IdentityAttribute).tags).toStrictEqual(["x+%+anExistingTag", "x+%+aNewTag"]);
            });

            test("accept with existing IdentityAttribute whose predecessor was already shared", async function () {
                const predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: TestObjectFactory.createIdentityAttribute({
                        owner: CoreAddress.from(accountController.identity.address)
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
                    existingAttributeId: successorRepositoryAttribute.id.toString()
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

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: successorRepositoryAttribute.id.toString(),
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
                    existingAttributeId: successorRepositoryAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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
                    existingAttributeId: successorRepositoryAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["x+%+aNewTag", "x+%+anotherNewTag"], valueType: "GivenName" })
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
                    existingAttributeId: repositoryAttribute.id.toString(),
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
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdAttribute!.content).toStrictEqual(alreadySharedAttribute.content);
                expect(createdAttribute!.deletionInfo).toBeUndefined();
            });

            test("accept with existing peer shared RelationshipAttribute that exists in the context of a Relationship with a third party", async function () {
                const peerAddress = CoreAddress.from("peerAddress");

                const localRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: accountController.identity.address
                    }),
                    peer: peerAddress,
                    requestReference: CoreId.from("reqRef")
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
                    existingAttributeId: localRelationshipAttribute.id.toString()
                };
                const result = await processor.accept(requestItem, acceptParams, incomingRequest);

                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);
                expect((result as ReadAttributeAcceptResponseItem).thirdPartyAddress?.toString()).toBe(peerAddress.toString());
            });

            test("accept with existing own shared RelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
                const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

                const predecessorSourceAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: accountController.identity.address
                    }),
                    peer: thirdPartyAddress,
                    requestReference: CoreId.from("reqRef")
                });

                const predecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorSourceAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("initialRequest")
                });

                const { successor: successorSourceAttribute } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(predecessorSourceAttribute.id, {
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
                    shareInfo: LocalAttributeShareInfo.from({
                        peer: thirdPartyAddress,
                        notificationReference: CoreId.from("successionNotification")
                    })
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
                    existingAttributeId: successorSourceAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const successorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(
                    (result as AttributeSuccessionAcceptResponseItem).successorId
                );
                expect(successorOwnSharedRelationshipAttribute).toBeDefined();
                expect(successorOwnSharedRelationshipAttribute!.shareInfo).toBeDefined();
                expect(successorOwnSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
                expect(successorOwnSharedRelationshipAttribute?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
                expect(successorOwnSharedRelationshipAttribute?.shareInfo?.thirdPartyAddress).toStrictEqual(thirdPartyAddress);
                expect(successorOwnSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorOwnSharedRelationshipAttribute.id);

                const updatedPredecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
                expect(updatedPredecessorOwnSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorOwnSharedRelationshipAttribute!.id);
            });

            test("accept with existing peer shared RelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
                const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

                const predecessorSourceAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                    content: TestObjectFactory.createRelationshipAttribute({
                        owner: thirdPartyAddress
                    }),
                    peer: thirdPartyAddress,
                    requestReference: CoreId.from("reqRef")
                });

                const predecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorSourceAttribute.id,
                    peer: sender,
                    requestReference: CoreId.from("initialRequest")
                });

                const { successor: successorSourceAttribute } = await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(predecessorSourceAttribute.id, {
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
                    shareInfo: LocalAttributeShareInfo.from({
                        peer: thirdPartyAddress,
                        notificationReference: CoreId.from("successionNotification")
                    })
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
                    existingAttributeId: successorSourceAttribute.id.toString()
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(AttributeSuccessionAcceptResponseItem);

                const successorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(
                    (result as AttributeSuccessionAcceptResponseItem).successorId
                );
                expect(successorOwnSharedRelationshipAttribute).toBeDefined();
                expect(successorOwnSharedRelationshipAttribute!.shareInfo).toBeDefined();
                expect(successorOwnSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
                expect(successorOwnSharedRelationshipAttribute?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
                expect(successorOwnSharedRelationshipAttribute?.shareInfo!.thirdPartyAddress).toStrictEqual(thirdPartyAddress);
                expect(successorOwnSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorOwnSharedRelationshipAttribute.id);

                const updatedPredecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
                expect(updatedPredecessorOwnSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorOwnSharedRelationshipAttribute!.id);
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
                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);

                expect(createdSharedAttribute).toBeDefined();
                expect(createdSharedAttribute!.shareInfo).toBeDefined();
                expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeDefined();

                const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
                expect(createdRepositoryAttribute).toBeDefined();
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

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdSharedAttribute).toBeDefined();
                expect((createdSharedAttribute!.content.value as GivenName).value).toBe("aGivenName");

                const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
                expect(createdRepositoryAttribute).toBeDefined();
                expect((createdRepositoryAttribute!.content.value as GivenName).value).toBe("aGivenName");
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
                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);

                expect(createdSharedAttribute).toBeDefined();
                expect(createdSharedAttribute!.shareInfo).toBeDefined();
                expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            });

            test("accept with new IdentityAttribute that is a duplicate", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
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

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
                expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toStrictEqual(existingRepositoryAttribute.id);
            });

            test("accept with new IdentityAttribute that is a duplicate after trimming", async function () {
                const existingRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
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

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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
                        tags: ["x+%+tag2"]
                    }
                };

                const result = await processor.accept(requestItem, acceptParams, incomingRequest);
                expect(result).toBeInstanceOf(ReadAttributeAcceptResponseItem);

                const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute((result as ReadAttributeAcceptResponseItem).attributeId);
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
        const recipient = CoreAddress.from("Recipient");

        test("creates a new peer shared Attribute with the Attribute received in the ResponseItem", async function () {
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
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("succeeds an existing peer shared IdentityAttribute with the Attribute received in the ResponseItem", async function () {
            const predecessorPeerSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                }),
                peer: recipient,
                requestReference: CoreId.from("oldReqRef")
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
                predecessorId: predecessorPeerSharedIdentityAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createIdentityAttribute({
                    owner: recipient,
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

        test("succeeds an existing ThirdPartyRelationshipAttribute with the Attribute received in the ResponseItem", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");

            const predecessorPeerSharedRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                }),
                peer: recipient,
                requestReference: CoreId.from("oldReqRef"),
                thirdPartyAddress: thirdPartyAddress
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
                predecessorId: predecessorPeerSharedRelationshipAttribute.id,
                successorId: successorId,
                successorContent: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress,
                    isTechnical: true
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const successorPeerSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPeerSharedRelationshipAttribute).toBeDefined();
            expect(successorPeerSharedRelationshipAttribute!.shareInfo).toBeDefined();
            expect(successorPeerSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorPeerSharedRelationshipAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(successorPeerSharedRelationshipAttribute!.shareInfo!.thirdPartyAddress).toStrictEqual(thirdPartyAddress);
            expect(successorPeerSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorPeerSharedRelationshipAttribute.id);

            const updatedPredecessorPeerSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorPeerSharedRelationshipAttribute.id);
            expect(updatedPredecessorPeerSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorPeerSharedRelationshipAttribute!.id);
        });
    });
});
