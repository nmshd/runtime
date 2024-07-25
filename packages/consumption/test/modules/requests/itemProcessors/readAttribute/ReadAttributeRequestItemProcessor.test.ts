import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
    AttributeSuccessionAcceptResponseItem,
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
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    DeletionStatus,
    LocalAttributeDeletionInfo,
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

        processor = new ReadAttributeRequestItemProcessor(consumptionController);
    });

    afterAll(async function () {
        await connection.close();
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

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

                expect(result).successfulValidationResult();
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
            test.each(testParams)("$description", function (testParams: TestParams) {
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
                        owner: translateTestIdentityToAddress(testParams.input.owner),
                        key: "AKey",
                        thirdParty: [translateTestIdentityToAddress(testParams.input.thirdParty)]
                    });
                } else {
                    query = RelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner),
                        key: "AKey",
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

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }), CoreAddress.from("recipient"));

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
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

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
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

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
                        value: "AGivenName"
                    },
                    tags: ["ATag"]
                }
            };

            const result = await processor.canAccept(requestItem, acceptParams, request);

            expect(result).successfulValidationResult();
        });

        test("can be called with an existing RelationshipAttribute by a third party", async function () {
            const sender = CoreAddress.from("Sender");
            const aThirdParty = CoreAddress.from("AThirdParty");

            const attribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: aThirdParty,
                    value: ProprietaryString.from({
                        title: "ATitle",
                        value: "AStringValue"
                    })
                }),
                peer: aThirdParty,
                requestReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "AKey",
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
                requestReference: await CoreId.generate()
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

        describe("canAccept ReadAttributeRequestitem with IdentityAttributeQuery", function () {
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

            test("can be called with property tags used in the IdentityAttributeQuery", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IdentityAttributeQuery.from({ tags: ["ATag"], valueType: "GivenName" })
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
                        tags: ["ATag", "AnotherTag"],
                        value: {
                            "@type": "GivenName",
                            value: "AGivenName"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with IQLQuery", function () {
            test("can be called with property tags used in the IQLQuery", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["tagA", "tagB", "tagC"] } })
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
                        tags: ["tagA", "tagD", "tagE"],
                        value: {
                            "@type": "GivenName",
                            value: "AGivenName"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with RelationshipAttributeQuery", function () {
            test("returns an error when a RelationshipAttribute was queried using a RelationshipAttributeQuery and the Recipient tries to respond with an existing RelationshipAttribute", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: recipient.toString(),
                        key: "AKey",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "ATitle",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
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

            test("can be called when a RelationshipAttribute of Value Type Consent is queried even though title and description is specified", async function () {
                const sender = CoreAddress.from("Sender");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: sender.toString(),
                        key: "AKey",
                        attributeCreationHints: {
                            valueType: "Consent",
                            title: "ATitle",
                            description: "ADescription",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Private,
                        owner: sender.toString(),
                        value: {
                            "@type": "Consent",
                            consent: "AConsent"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });

            test("can be called with properties validFrom and validTo used in the query", async function () {
                const sender = CoreAddress.from("Sender");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: sender.toString(),
                        key: "AKey",
                        validFrom: "2024-02-14T08:47:35.077Z",
                        validTo: "2024-02-14T09:35:12.824Z",
                        attributeCreationHints: {
                            valueType: "ProprietaryString",
                            title: "ATitle",
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "RelationshipAttribute",
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: sender.toString(),
                        validFrom: "2024-02-14T08:40:35.077Z",
                        validTo: "2024-02-14T09:35:12.824Z",
                        value: {
                            "@type": "ProprietaryString",
                            title: "ATitle",
                            value: "AStringValue"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).successfulValidationResult();
            });
        });

        describe("canAccept ReadAttributeRequestitem with ThirdPartyRelationshipAttributeQuery", function () {
            test("returns an error when a RelationshipAttribute is a copy of a sourceAttribute that was queried using a ThirdPartyRelationshipAttributeQuery", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;
                const aThirdParty = CoreAddress.from("AThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "AKey",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
                        })
                    }),
                    shareInfo: {
                        peer: aThirdParty,
                        requestReference: await ConsumptionIds.request.generate(),
                        sourceAttribute: CoreId.from("sourceAttributeId")
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
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;
                const aThirdParty = CoreAddress.from("AThirdParty");
                const anUninvolvedThirdParty = CoreAddress.from("AnUninvolvedThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "AKey",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
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

            test("returns an error when a RelationshipAttribute is shared with a third party with which only a pending Relationship exists", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;
                const aThirdParty = CoreAddress.from("AThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "AKey",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
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
                    message: "The provided RelationshipAttribute exists in the context of a pending Relationship with a third party. Before sharing it, activate the Relationship."
                });
            });

            test("returns an error when a RelationshipAttribute was queried using a ThirdPartyRelationshipAttributeQuery and the Recipient tries to respond with a new RelationshipAttribute", async function () {
                const sender = CoreAddress.from("Sender");
                const aThirdParty = CoreAddress.from("AThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                        key: "AKey",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: aThirdParty.toString(),
                        value: {
                            "@type": "ProprietaryString",
                            title: "ATitle",
                            value: "AStringValue"
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
                const sender = CoreAddress.from("Sender");
                const aThirdParty = CoreAddress.from("AThirdParty");
                const anUninvolvedThirdParty = CoreAddress.from("AnUninvolvedThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: "",
                        key: "AKey",
                        thirdParty: ["", aThirdParty.toString()]
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
                        owner: anUninvolvedThirdParty,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
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

                expect(result).successfulValidationResult();
            });

            test("returns an error when the confidentiality of the existing RelationshipAttribute to be shared is private", async function () {
                const sender = CoreAddress.from("Sender");
                const recipient = accountController.identity.address;
                const aThirdParty = CoreAddress.from("AThirdParty");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: ThirdPartyRelationshipAttributeQuery.from({
                        owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                        key: "AKey",
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
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Private,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
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
        test("accept with existing RepositoryAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;
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

        test("accept with new IdentityAttribute", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;
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
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
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
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
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
            const sender = CoreAddress.from("Sender");

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

        test("accept with existing IdentityAttribute whose predecessor was already shared but deleted by peer", async function () {
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
                shareInfo: LocalAttributeShareInfo.from({ sourceAttribute: predecessorRepositoryAttribute.id, peer: sender, requestReference: await CoreId.generate() }),
                deletionInfo: LocalAttributeDeletionInfo.from({ deletionStatus: DeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc().subtract({ days: 1 }) })
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
            const sender = CoreAddress.from("Sender");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: accountController.identity.address
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

        test("accept with existing IdentityAttribute that is already shared and the latest shared version but deleted by peer", async function () {
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
                shareInfo: LocalAttributeShareInfo.from({ sourceAttribute: repositoryAttribute.id, peer: sender, requestReference: await CoreId.generate() }),
                deletionInfo: LocalAttributeDeletionInfo.from({ deletionStatus: DeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc().subtract({ days: 1 }) })
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

        test("accept with existing own shared RelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const sender = CoreAddress.from("Sender");

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
                        title: "ANewTitle",
                        value: "ANewValue"
                    },
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey",
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
                    key: "AKey",
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

            const successorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOwnSharedRelationshipAttribute).toBeDefined();
            expect(successorOwnSharedRelationshipAttribute!.shareInfo).toBeDefined();
            expect(successorOwnSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOwnSharedRelationshipAttribute?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
            expect(successorOwnSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorOwnSharedRelationshipAttribute.id);

            const updatedPredecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
            expect(updatedPredecessorOwnSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorOwnSharedRelationshipAttribute!.id);
        });

        test("accept with existing peer shared RelationshipAttribute that exists in the context of a Relationship with a third party whose predecessor was already shared", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const sender = CoreAddress.from("Sender");

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
                        title: "ANewTitle",
                        value: "ANewValue"
                    },
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey",
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
                    key: "AKey",
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

            const successorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute((result as AttributeSuccessionAcceptResponseItem).successorId);
            expect(successorOwnSharedRelationshipAttribute).toBeDefined();
            expect(successorOwnSharedRelationshipAttribute!.shareInfo).toBeDefined();
            expect(successorOwnSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorOwnSharedRelationshipAttribute?.shareInfo!.sourceAttribute).toStrictEqual(successorSourceAttribute.id);
            expect(successorOwnSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorOwnSharedRelationshipAttribute.id);

            const updatedPredecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
            expect(updatedPredecessorOwnSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorOwnSharedRelationshipAttribute!.id);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates a new peer shared Attribute with the Attribute received in the ResponseItem", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();
            const recipient = CoreAddress.from("Recipient");

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
            const recipient = CoreAddress.from("Recipient");

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
                    owner: recipient
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

        test("succeeds an existing third party owned RelationshipAttribute with the Attribute received in the ResponseItem", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAddress");
            const recipient = CoreAddress.from("Recipient");

            const predecessorPeerSharedRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createRelationshipAttribute({
                    owner: thirdPartyAddress
                }),
                peer: recipient,
                requestReference: CoreId.from("oldReqRef")
            });

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    key: "AKey",
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
                    owner: thirdPartyAddress
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const successorPeerSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(successorId);
            expect(successorPeerSharedRelationshipAttribute).toBeDefined();
            expect(successorPeerSharedRelationshipAttribute!.shareInfo).toBeDefined();
            expect(successorPeerSharedRelationshipAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(successorPeerSharedRelationshipAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(successorPeerSharedRelationshipAttribute!.succeeds).toStrictEqual(predecessorPeerSharedRelationshipAttribute.id);

            const updatedPredecessorPeerSharedRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(predecessorPeerSharedRelationshipAttribute.id);
            expect(updatedPredecessorPeerSharedRelationshipAttribute!.succeededBy).toStrictEqual(successorPeerSharedRelationshipAttribute!.id);
        });
    });
});
