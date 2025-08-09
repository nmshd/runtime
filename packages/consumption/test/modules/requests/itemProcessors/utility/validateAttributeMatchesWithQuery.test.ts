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
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
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

    let thirdPartyAccountController: AccountController;

    let recipient: CoreAddress;
    const sender = CoreAddress.from("Sender");
    let aThirdParty: CoreAddress;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        ({ accountController, consumptionController } = accounts[0]);
        recipient = accountController.identity.address;

        ({ accountController: thirdPartyAccountController } = accounts[1]);
        aThirdParty = thirdPartyAccountController.identity.address;

        await TestUtil.addRelationship(accountController, thirdPartyAccountController);
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided Attribute is not an IdentityAttribute, but an IdentityAttribute was queried."
            });
        });

        test("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
            const thirdPartyAttributeId = await ConsumptionIds.attribute.generate();
            await consumptionController.attributes.createSharedLocalAttribute({
                id: thirdPartyAttributeId,
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
                        value: "aGivenName"
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
                        value: "aDisplayName"
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
                query: IdentityAttributeQuery.from({ valueType: "GivenName", tags: ["x:aTag"] })
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
                query: IdentityAttributeQuery.from({ tags: ["x:tagA", "x:tagB", "x:tagC"], valueType: "GivenName" })
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
                    tags: ["x:tagD", "x:tagE", "x:tagF"],
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
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
                        value: "aGivenName"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes."
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "RelationshipAttribute",
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: recipient.toString(),
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "aTitle",
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "RelationshipAttribute",
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: sender.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
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

            const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                accept: true,
                newAttribute: {
                    "@type": "RelationshipAttribute",
                    key: "AnotherKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    owner: sender.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
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
                    key: "aKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "aTitle",
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
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Private,
                    owner: sender.toString(),
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
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
                    key: "aKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
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
                        "@type": "ProprietaryString",
                        title: "AnotherTitle",
                        description: "aDescription",
                        value: "aStringValue"
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
                    key: "aKey",
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
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
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "aStringValue"
                    }
                }
            };

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried description."
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

            const localAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not belong to a queried owner."
            });
        });

        test("returns an error when a RelationshipAttribute that was queried by a ThirdPartyRelationshipAttributeQuery does not belong to the Recipient or one of the queried third parties, but an empty string was specified for the owner of the query", async function () {
            const aQueriedThirdParty = CoreAddress.from("aQueriedThirdParty");

            const requestItem = ReadAttributeRequestItem.from({
                mustBeAccepted: true,
                query: ThirdPartyRelationshipAttributeQuery.from({
                    owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                    key: "aKey",
                    thirdParty: [aQueriedThirdParty.toString()]
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
                sourceReference: await ConsumptionIds.request.generate()
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
                    key: "AnotherKey",
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

            const result = await readProcessor.canAccept(requestItem, acceptParams, request);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.attributeQueryMismatch",
                message: "The provided RelationshipAttribute does not have the queried key."
            });
        });
    });
});
