import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
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
    LocalRequest,
    LocalRequestStatus,
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
            test.each(testParams)("${value.description}", function (testParams: TestParams) {
                function translateTestIdentityToAddress(testIdentity?: TestIdentity) {
                    if (typeof testIdentity === "undefined") return undefined;

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
                if (typeof testParams.input.thirdParty !== "undefined") {
                    query = ThirdPartyRelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner)!,
                        key: "AKey",
                        thirdParty: [translateTestIdentityToAddress(testParams.input.thirdParty)!]
                    });
                } else {
                    query = RelationshipAttributeQuery.from({
                        owner: translateTestIdentityToAddress(testParams.input.owner)!,
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

            const attribute = await consumptionController.attributes.createLocalAttribute({
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

            const attribute = await consumptionController.attributes.createLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: aThirdParty,
                    value: ProprietaryString.from({
                        title: "ATitle",
                        value: "AStringValue"
                    })
                }),
                shareInfo: {
                    peer: aThirdParty,
                    requestReference: await ConsumptionIds.request.generate()
                }
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

        describe("canAccept ReadAttributeRequestitem with IdentityAttributeQuery", function () {
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

                const localAttribute = await consumptionController.attributes.createLocalAttribute({
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
                        peer: sender,
                        requestReference: await ConsumptionIds.request.generate()
                    }
                });

                const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                    accept: true,
                    existingAttributeId: localAttribute.id.toString()
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.canAccept.invalidAcceptParameters",
                    message: "When responding to a RelationshipAttributeQuery, only new RelationshipAttributes may be provided."
                });
            });

            test("returns an error when a RelationshipAttribute does not belong to the Recipient, but an empty string was specified for the owner of the query", async function () {
                const sender = CoreAddress.from("Sender");

                const requestItem = ReadAttributeRequestItem.from({
                    mustBeAccepted: true,
                    query: RelationshipAttributeQuery.from({
                        owner: "",
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

                const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                    accept: true,
                    newAttribute: {
                        "@type": "RelationshipAttribute",
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: sender.toString(),
                        value: {
                            "@type": "ProprietaryString",
                            title: "ATitle",
                            value: "AStringValue"
                        }
                    }
                };

                const result = await processor.canAccept(requestItem, acceptParams, request);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.attributeQueryMismatch",
                    message: "You are not the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
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

                const localAttribute = await consumptionController.attributes.createLocalAttribute({
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

                const localAttribute = await consumptionController.attributes.createLocalAttribute({
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
                        peer: anUninvolvedThirdParty,
                        requestReference: await ConsumptionIds.request.generate()
                    }
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

                const localAttribute = await consumptionController.attributes.createLocalAttribute({
                    content: RelationshipAttribute.from({
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        owner: anUninvolvedThirdParty,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
                        })
                    }),
                    shareInfo: {
                        peer: anUninvolvedThirdParty,
                        requestReference: await ConsumptionIds.request.generate()
                    }
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

                const localAttribute = await consumptionController.attributes.createLocalAttribute({
                    content: RelationshipAttribute.from({
                        key: "AKey",
                        confidentiality: RelationshipAttributeConfidentiality.Private,
                        owner: recipient,
                        value: ProprietaryString.from({
                            title: "ATitle",
                            value: "AStringValue"
                        })
                    }),
                    shareInfo: {
                        peer: aThirdParty,
                        requestReference: await ConsumptionIds.request.generate()
                    }
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
        test("in case of a given attributeId of an own Local Attribute, creates a copy of the Local Attribute with the given id with share info for the peer of the Request", async function () {
            const sender = CoreAddress.from("Sender");
            const recipient = accountController.identity.address;

            const attribute = await consumptionController.attributes.createLocalAttribute({
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

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
        });

        test("in case of a given own IdentityAttribute, creates a new Repository Attribute as well as a copy of it for the peer", async function () {
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
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeDefined();

            const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(createdSharedAttribute!.shareInfo!.sourceAttribute!);
            expect(createdRepositoryAttribute).toBeDefined();
        });

        test("in case of a given peer RelationshipAttribute, creates a new Local Attribute with share info for the peer of the Request - but no Repository Attribute", async function () {
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
            const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);

            expect(createdSharedAttribute).toBeDefined();
            expect(createdSharedAttribute!.shareInfo).toBeDefined();
            expect(createdSharedAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdSharedAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("creates a peer Attribute with the Attribute received in the ResponseItem", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName" })
            });
            const requestId = await ConsumptionIds.request.generate();

            const incomingRequest = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: CoreAddress.from("Recipient"),
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
                    owner: CoreAddress.from("Recipient")
                })
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(incomingRequest.peer.toString());
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
        });
    });
});
