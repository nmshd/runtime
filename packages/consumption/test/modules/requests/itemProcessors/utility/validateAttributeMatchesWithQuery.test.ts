import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    IdentityAttributeQuery,
    IQLQuery,
    ProprietaryString,
    ReadAttributeRequestItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport";
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

describe("validateAttributeMatchesWithQuery", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let readProcessor: ReadAttributeRequestItemProcessor;

    let recipient: CoreAddress;
    const sender = CoreAddress.from("Sender");
    const aThirdParty = CoreAddress.from("AThirdParty");
    const anUninvolvedThirdParty = CoreAddress.from("AnUninvolvedThirdParty");
    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        ({ accountController, consumptionController } = accounts[0]);
        recipient = accountController.identity.address;
    });

    afterAll(async function () {
        await connection.close();
    });

    describe("IdentityAttributeQuery", function () {
        beforeEach(function () {
            readProcessor = new ReadAttributeRequestItemProcessor(consumptionController);
        });

        test("returns an error when an IdentityAttribute was queried by an IdentityAttributeQuery and the peer tries to respond with a RelationshipAttribute", async function () {
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not an IdentityAttribute, but an IdentityAttribute was queried."
            });
        });

        test("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
            const thirdPartyAttributeId = await ConsumptionIds.attribute.generate();
            await consumptionController.attributes.createPeerLocalAttribute({
                id: thirdPartyAttributeId,
                content: TestObjectFactory.createIdentityAttribute({
                    owner: aThirdParty
                }),
                peer: aThirdParty,
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
                existingAttributeId: thirdPartyAttributeId.toString()
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes."
            });
        });

        test("returns an error when the new IdentityAttribute to be created and shared belongs to a third party", async function () {
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
                    owner: aThirdParty.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes."
            });
        });

        test("returns an error when an IdentityAttribute of a specific type was queried by an IdentityAttributeQuery and the peer tries to respond with an IdentityAttribute of another type", async function () {
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
                        "@type": "DisplayName",
                        value: "ADisplayName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute is not of the queried IdentityAttribute value type."
            });
        });

        test("returns an error when an IdentityAttribute has no tag but at least one tag was queried by IdentityAttributeQuery", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ valueType: "GivenName", tags: ["ATag"] })
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
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The tags of the provided IdentityAttribute do not contain at least one queried tag."
            });
        });

        test("returns an error when the tags of the IdentityAttribute do not match the tags queried by IdentityAttributeQuery", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ tags: ["tagA", "tagB", "tagC"], valueType: "GivenName" })
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
                    tags: ["tagD", "tagE", "tagF"],
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The tags of the provided IdentityAttribute do not contain at least one queried tag."
            });
        });

        test("returns an error when an IdentityAttribute is not valid in the queried time frame", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IdentityAttributeQuery.from({ validTo: "2024-02-14T09:35:12.824Z", valueType: "GivenName" })
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
                    validFrom: "2024-02-14T08:47:35.077Z",
                    validTo: "2024-02-14T09:35:12.824Z",
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not valid in the queried time frame."
            });
        });
    });

    describe("IQLQuery", function () {
        beforeEach(function () {
            readProcessor = new ReadAttributeRequestItemProcessor(consumptionController);
        });

        test("returns an error when an IdentityAttribute was queried by an IQLQuery and the peer tries to respond with a RelationshipAttribute", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } })
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
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not an IdentityAttribute. Currently, only IdentityAttributes can be queried by an IQLQuery."
            });
        });

        test("returns an error when the IdentityAttribute queried by an IQLQuery is not owned by the Recipient", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } })
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
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes."
            });
        });

        test("returns an error when an IdentityAttribute of a specific type was queried by an IQLQuery and the peer tries to respond with an IdentityAttribute of another type", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName" } })
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
                        "@type": "DisplayName",
                        value: "ADisplayName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute is not of the queried IdentityAttribute value type."
            });
        });

        test("returns an error when an IdentityAttribute has no tag but at least one tag was queried by IQLQuery", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: IQLQuery.from({ queryString: "GivenName", attributeCreationHints: { valueType: "GivenName", tags: ["ATag"] } })
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
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The tags of the provided IdentityAttribute do not contain at least one queried tag."
            });
        });

        test("returns an error when the tags of the IdentityAttribute do not match the tags queried by IQLQuery", async function () {
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
                    tags: ["tagD", "tagE", "tagF"],
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The tags of the provided IdentityAttribute do not contain at least one queried tag."
            });
        });
    });

    describe("RelationshipAttributeQuery", function () {
        beforeEach(function () {
            readProcessor = new ReadAttributeRequestItemProcessor(consumptionController);
        });

        test("returns an error when a RelationshipAttribute was queried and the Recipient tries to respond with an IdentityAttribute", async function () {
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried."
            });
        });

        test("returns an error when a RelationshipAttribute of a specific type was queried and the Recipient tries to respond with a RelationshipAttribute of another type", async function () {
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "RelationshipAttribute",
                    key: "AKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "ATitle",
                        value: 1
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute is not of the queried RelationshipAttribute value type."
            });
        });

        test("returns an error when a RelationshipAttribute does not belong to the queried owner", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: sender.toString(),
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
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not belong to the queried owner."
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "You are not the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
            });
        });

        test("returns an error when a RelationshipAttribute does not have the queried key", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: sender.toString(),
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
                    key: "AnotherKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: sender.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried key."
            });
        });

        test("returns an error when a RelationshipAttribute does not have the queried confidentiality", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: sender.toString(),
                    key: "AKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "ATitle",
                        confidentiality: RelationshipAttributeConfidentiality.Protected
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
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried confidentiality."
            });
        });

        test("returns an error when a RelationshipAttribute does not have the queried title", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: sender.toString(),
                    key: "AKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
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
                        "@type": "ProprietaryString",
                        title: "AnotherTitle",
                        description: "ADescription",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried title."
            });
        });

        test("returns an error when a RelationshipAttribute does not have the queried description", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: RelationshipAttributeQuery.from({
                    owner: sender.toString(),
                    key: "AKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
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
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried description."
            });
        });

        test("returns an error when a RelationshipAttribute is not valid in the queried time frame", async function () {
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
                    validFrom: "2024-02-14T08:47:35.077Z",
                    validTo: "2024-02-14T09:30:00.000Z",
                    value: {
                        "@type": "ProprietaryString",
                        title: "ATitle",
                        value: "AStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not valid in the queried time frame."
            });
        });
    });

    describe("ThirdPartyRelationshipAttributeQuery", function () {
        beforeEach(function () {
            readProcessor = new ReadAttributeRequestItemProcessor(consumptionController);
        });

        test("returns an error when a RelationshipAttribute was queried using a ThirdPartyRelationshipAttributeQuery and the Recipient tries to respond with an IdentityAttribute", async function () {
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
                content: TestObjectFactory.createIdentityAttribute({
                    owner: recipient
                })
            });

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: localAttribute.id.toString()
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not a RelationshipAttribute, but a RelationshipAttribute was queried."
            });
        });

        test("returns an error when a RelationshipAttribute does not belong to the owner that was queried using a ThirdPartyRelationshipAttributeQuery", async function () {
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                accept: true,
                existingAttributeId: localAttribute.id.toString()
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not belong to a queried owner."
            });
        });

        test("returns an error when a RelationshipAttribute that was queried by a ThirdPartyRelationshipAttributeQuery does not belong to the Recipient or one of the involved third parties, but an empty string was specified for the owner of the query", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message:
                    "Neither you nor one of the involved third parties is the owner of the provided RelationshipAttribute, but an empty string was specified for the owner of the query."
            });
        });

        test("returns an error when a RelationshipAttribute does not have the key that was queried using a ThirdPartyRelationshipAttributeQuery", async function () {
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
                    key: "AnotherKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried key."
            });
        });

        test("returns an error when a RelationshipAttribute is not valid in the time frame that was queried using a ThirdPartyRelationshipAttributeQuery", async function () {
            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                    validFrom: "2024-02-14T08:47:35.077Z",
                    validTo: "2024-02-14T09:35:12.824Z",
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
                    validFrom: CoreDate.from("2024-02-14T08:47:35.077Z"),
                    validTo: CoreDate.from("2024-02-14T09:30:00.000Z"),
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not valid in the queried time frame."
            });
        });
    });
});
