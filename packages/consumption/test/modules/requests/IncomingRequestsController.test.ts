import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    CreateAttributeRequestItem,
    IdentityAttributeQuery,
    IReadAttributeRequestItem,
    IRequest,
    IRequestItemGroup,
    ProprietaryString,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    Request,
    RequestItemGroup,
    ResponseItem,
    ResponseItemGroup,
    ResponseItemResult
} from "@nmshd/content";
import { CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import {
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionIds,
    DecideRequestItemGroupParametersJSON,
    DecideRequestParametersJSON,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus
} from "../../../src";
import { loggerFactory, TestUtil } from "../../core/TestUtil";
import { RequestsGiven, RequestsTestsContext, RequestsThen, RequestsWhen } from "./RequestsIntegrationTest";
import { TestObjectFactory } from "./testHelpers/TestObjectFactory";
import { ITestRequestItem, TestRequestItem } from "./testHelpers/TestRequestItem";

let context: RequestsTestsContext;

describe("IncomingRequestsController", function () {
    let connection: IDatabaseConnection;

    let Given: RequestsGiven; // eslint-disable-line @typescript-eslint/naming-convention
    let When: RequestsWhen; // eslint-disable-line @typescript-eslint/naming-convention
    let Then: RequestsThen; // eslint-disable-line @typescript-eslint/naming-convention

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(async function () {
        TransportLoggerFactory.init(loggerFactory);

        context = await RequestsTestsContext.create(connection, TestUtil.createConfig());

        Given = new RequestsGiven(context);
        When = new RequestsWhen(context);
        Then = new RequestsThen(context);
    });

    afterEach(function () {
        context.reset();
    });

    describe("Received", function () {
        test("creates an incoming Request with an incoming Message as sourceObject", async function () {
            const incomingMessage = TestObjectFactory.createIncomingMessage(context.currentIdentity);
            await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingMessage });
            await Then.theCreatedRequestHasAllProperties(incomingMessage.cache!.createdBy, incomingMessage.id, "Message");
            await Then.theRequestIsInStatus(LocalRequestStatus.Open);
            await Then.theNewRequestIsPersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestReceivedEvent);
        });

        test("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
            const incomingTemplate = TestObjectFactory.createIncomingRelationshipTemplate();
            await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingTemplate });
            await Then.theCreatedRequestHasAllProperties(incomingTemplate.cache!.createdBy, incomingTemplate.id, "RelationshipTemplate");
            await Then.theRequestIsInStatus(LocalRequestStatus.Open);
            await Then.theNewRequestIsPersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestReceivedEvent);
        });

        test("takes the expiration date from the Template if the Request has no expiration date", async function () {
            const timestamp = CoreDate.utc().subtract({ second: 1 });
            const incomingTemplate = TestObjectFactory.createIncomingRelationshipTemplate(timestamp);
            await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingTemplate });
            await Then.theRequestHasExpirationDate(timestamp);
            await Then.theRequestIsInStatus(LocalRequestStatus.Expired);
        });

        test("takes the expiration date from the Template if the Request has a later expiration date", async function () {
            const timestamp = CoreDate.utc().add({ days: 1 });
            const incomingTemplate = TestObjectFactory.createIncomingRelationshipTemplate(timestamp);
            await When.iCreateAnIncomingRequestWith({
                requestSourceObject: incomingTemplate,
                receivedRequest: TestObjectFactory.createRequestWithOneItem({ expiresAt: timestamp.add({ days: 1 }) })
            });
            await Then.theRequestHasExpirationDate(timestamp);
        });

        test("takes the expiration date from the Request if the Template has a later expiration date", async function () {
            const timestamp = CoreDate.utc().add({ days: 1 });
            const incomingTemplate = TestObjectFactory.createIncomingRelationshipTemplate(timestamp.add({ days: 1 }));
            await When.iCreateAnIncomingRequestWith({
                requestSourceObject: incomingTemplate,
                receivedRequest: TestObjectFactory.createRequestWithOneItem({ expiresAt: timestamp })
            });
            await Then.theRequestHasExpirationDate(timestamp);
        });

        test("uses the ID of the given Request if it exists", async function () {
            const request = TestObjectFactory.createRequestWithOneItem({ id: await CoreIdHelper.notPrefixed.generate() });

            await When.iCreateAnIncomingRequestWith({ receivedRequest: request });
            await Then.theRequestHasTheId(request.id!);
        });

        test("cannot create incoming Request with an outgoing Message as source", async function () {
            const outgoingMessage = TestObjectFactory.createOutgoingMessage(context.currentIdentity);
            await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingMessage });
            await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create incoming Request from own Message");
        });

        test("cannot create incoming Request with an outgoing RelationshipTemplate as source", async function () {
            const outgoingTemplate = TestObjectFactory.createOutgoingRelationshipTemplate(context.currentIdentity);
            await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingTemplate });
            await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create incoming Request from own Relationship Template");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToCallReceivedWithoutSource();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestSourceObject*Value is not defined*");
        });
    });

    describe("CheckPrerequisites", function () {
        test("can handle valid input", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iCheckPrerequisites();
            await Then.theRequestIsInStatus(LocalRequestStatus.DecisionRequired);
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.DecisionRequired
            });
        });

        test.each([
            {
                content: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                        } as ITestRequestItem
                    ]
                } as IRequest
            },
            {
                content: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem,
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                        } as ITestRequestItem
                    ]
                } as IRequest
            },
            {
                content: {
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest
            }
        ])("does not change the status when a RequestItemProcessor returns false", async function (testParams) {
            await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Open,
                content: testParams.content
            });
            await When.iCheckPrerequisites();
            await Then.theRequestIsInStatus(LocalRequestStatus.Open);
            await Then.eventHasBeenPublished(IncomingRequestReceivedEvent);
        });

        test("throws when the Local Request is not in status 'Open'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iTryToCheckPrerequisites();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Open'*");
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            const nonExistentId = CoreId.from("nonExistentId");
            await When.iTryToCheckPrerequisitesWith({ requestId: nonExistentId });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToCheckPrerequisitesWithoutARequestId();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*");
        });
    });

    describe("RequireManualDecision", function () {
        test("can handle valid input", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iRequireManualDecision();
            await Then.theRequestIsInStatus(LocalRequestStatus.ManualDecisionRequired);
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.ManualDecisionRequired
            });
        });

        test("throws when the Local Request is not in status 'DecisionRequired'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToRequireManualDecision();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'DecisionRequired'*");
            await Then.eventHasBeenPublished(IncomingRequestReceivedEvent);
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            const nonExistentId = CoreId.from("nonExistentId");
            await When.iTryToRequireManualDecisionWith({ requestId: nonExistentId });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToRequireManualDecisionWithoutRequestId();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*");
        });
    });

    describe("CanAccept", function () {
        test("returns 'success' on valid parameters", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iCallCanAccept();
            await Then.itReturnsASuccessfulValidationResult();
        });

        test.each([
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCanAccept: true
                        } as ITestRequestItem
                    ]
                } as IRequest,
                acceptParams: {
                    items: [
                        {
                            accept: true
                        }
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            },

            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem,
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCanAccept: true
                        } as ITestRequestItem
                    ]
                } as IRequest,
                acceptParams: {
                    items: [
                        {
                            accept: true
                        },
                        {
                            accept: true
                        }
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            },

            {
                request: {
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanAccept: true
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest,
                acceptParams: {
                    items: [
                        {
                            items: [
                                {
                                    accept: true
                                }
                            ]
                        } as DecideRequestItemGroupParametersJSON
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            }
        ])("returns 'error' when at least one RequestItem is invalid", async function (testParams) {
            await Given.anIncomingRequestWith({
                content: testParams.request,
                status: LocalRequestStatus.DecisionRequired
            });
            await When.iCallCanAcceptWith({
                items: testParams.acceptParams.items
            });
            await Then.itReturnsAnErrorValidationResult();
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            await When.iTryToCallCanAcceptWith({ requestId: "nonExistentId" });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToCallCanAcceptWithoutARequestId();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*");
        });

        test("throws on invalid input value", async function () {
            const request = {
                items: [
                    {
                        "@type": "ReadAttributeRequestItem",
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    } as IReadAttributeRequestItem,
                    {
                        "@type": "ReadAttributeRequestItem",
                        mustBeAccepted: false,
                        query: IdentityAttributeQuery.from({ valueType: "EMailAddress" })
                    } as IReadAttributeRequestItem
                ]
            } as IRequest;

            await Given.anIncomingRequestWith({
                content: request,
                status: LocalRequestStatus.DecisionRequired
            });

            const acceptParams = {
                items: [
                    {
                        accept: true,
                        newAttribute: {
                            "@type": "IdentityAttribute",
                            owner: context.currentIdentity.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "aGivenName"
                            }
                        }
                    } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
                    {
                        accept: true,
                        newAttribute: {
                            "@type": "IdentityAttribute",
                            owner: context.currentIdentity.toString(),
                            value: {
                                "@type": "EMailAddress",
                                value: "invalid-email-address"
                            }
                        }
                    } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
                ]
            } as Omit<DecideRequestParametersJSON, "requestId">;

            await When.iCallCanAcceptWith(acceptParams);
            await Then.itReturnsAnErrorValidationResult();
        });

        test("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToCallCanAccept();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*");
        });

        test("returns a validation result that contains a sub result for each item", async function () {
            const request = {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    }),
                    RequestItemGroup.from({
                        items: [
                            TestRequestItem.from({
                                mustBeAccepted: false,
                                shouldFailAtCanAccept: true
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: false
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: false,
                                shouldFailAtCanAccept: true
                            })
                        ]
                    })
                ]
            } as IRequest;

            const acceptParams = {
                items: [
                    {
                        accept: true
                    },
                    {
                        items: [
                            {
                                accept: true
                            },
                            {
                                accept: true
                            },
                            {
                                accept: true
                            }
                        ]
                    }
                ]
            } as Omit<DecideRequestParametersJSON, "requestId">;

            await Given.anIncomingRequestWith({
                content: request,
                status: LocalRequestStatus.DecisionRequired
            });

            const validationResult = await When.iCallCanAcceptWith({
                items: acceptParams.items
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem",
                message: "Some child items have errors."
            });
            expect(validationResult.items).toHaveLength(2);

            expect(validationResult.items[0].isError()).toBe(false);

            expect(validationResult.items[1].isError()).toBe(true);
            expect(validationResult.items[1]).errorValidationResult({ code: "error.consumption.requests.validation.inheritedFromItem" });

            expect(validationResult.items[1].items).toHaveLength(3);
            expect(validationResult.items[1].items[0].isError()).toBe(true);
            expect(validationResult.items[1].items[1].isError()).toBe(false);
            expect(validationResult.items[1].items[2].isError()).toBe(true);
        });

        test("returns a validation result that merges the results from decideRequestParamsValidator and the RequestItemProcessor", async function () {
            const request = {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: true
                    }),
                    TestRequestItem.from({
                        mustBeAccepted: true
                    }),
                    TestRequestItem.from({
                        mustBeAccepted: true,
                        shouldFailAtCanAccept: true
                    }),
                    TestRequestItem.from({
                        mustBeAccepted: true,
                        shouldFailAtCanReject: true
                    }),
                    RequestItemGroup.from({
                        items: [
                            TestRequestItem.from({
                                mustBeAccepted: true
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: true
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: true,
                                shouldFailAtCanAccept: true
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: true,
                                shouldFailAtCanReject: true
                            })
                        ]
                    })
                ]
            } as IRequest;

            const acceptParams = {
                items: [
                    {
                        accept: true
                    },
                    {
                        accept: false
                    },
                    {
                        accept: true
                    },
                    {
                        accept: false
                    },
                    {
                        items: [
                            {
                                accept: true
                            },
                            {
                                accept: false
                            },
                            {
                                accept: true
                            },
                            {
                                accept: false
                            }
                        ]
                    }
                ]
            } as Omit<DecideRequestParametersJSON, "requestId">;

            await Given.anIncomingRequestWith({
                content: request,
                status: LocalRequestStatus.DecisionRequired
            });

            const validationResult = await When.iCallCanAcceptWith({
                items: acceptParams.items
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem",
                message: "Some child items have errors."
            });
            expect(validationResult.items).toHaveLength(5);

            expect(validationResult.items[0].isError()).toBe(false);
            expect(validationResult.items[1].isError()).toBe(true);
            expect(validationResult.items[2].isError()).toBe(true);
            expect(validationResult.items[3].isError()).toBe(true);

            expect(validationResult.items[4].isError()).toBe(true);
            expect(validationResult.items[4]).errorValidationResult({ code: "error.consumption.requests.validation.inheritedFromItem" });

            expect(validationResult.items[4].items).toHaveLength(4);
            expect(validationResult.items[4].items[0].isError()).toBe(false);
            expect(validationResult.items[4].items[1].isError()).toBe(true);
            expect(validationResult.items[4].items[2].isError()).toBe(true);
            expect(validationResult.items[4].items[3].isError()).toBe(true);
        });

        test("throws error for requests whose acceptance always would lead to the creation of more than one RelationshipAttribute with the same key", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [
                        CreateAttributeRequestItem.from({
                            mustBeAccepted: true,
                            attribute: RelationshipAttribute.from({
                                "@type": "RelationshipAttribute",
                                owner: context.currentIdentity.toString(),
                                key: "uniqueKey",
                                confidentiality: RelationshipAttributeConfidentiality.Public,
                                value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                            })
                        }),
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                ReadAttributeRequestItem.from({
                                    mustBeAccepted: true,
                                    query: RelationshipAttributeQuery.from({
                                        owner: context.currentIdentity.toString(),
                                        key: "uniqueKey",
                                        attributeCreationHints: {
                                            valueType: "ProprietaryString",
                                            title: "aTitle",
                                            confidentiality: RelationshipAttributeConfidentiality.Public
                                        }
                                    })
                                })
                            ]
                        } as IRequestItemGroup
                    ]
                },
                status: LocalRequestStatus.DecisionRequired
            });
            await expect(
                When.iCallCanAcceptWith({
                    items: [
                        {
                            accept: true
                        },
                        {
                            items: [
                                {
                                    accept: true,
                                    newAttribute: RelationshipAttribute.from({
                                        "@type": "RelationshipAttribute",
                                        owner: context.currentIdentity.toString(),
                                        key: "uniqueKey",
                                        confidentiality: RelationshipAttributeConfidentiality.Public,
                                        value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                                    }).toJSON()
                                } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
                            ]
                        }
                    ]
                })
            ).rejects.toThrow(
                `error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes: 'The Request can never be accepted because it would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type.'`
            );
        });

        test("returns 'error' on requests whose acceptance only would lead to the creation of more than one RelationshipAttribute with the same key with some parameters", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [
                        CreateAttributeRequestItem.from({
                            mustBeAccepted: true,
                            attribute: RelationshipAttribute.from({
                                "@type": "RelationshipAttribute",
                                owner: context.currentIdentity.toString(),
                                key: "uniqueKey",
                                confidentiality: RelationshipAttributeConfidentiality.Public,
                                value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                            })
                        }),
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                ReadAttributeRequestItem.from({
                                    mustBeAccepted: false,
                                    query: RelationshipAttributeQuery.from({
                                        owner: context.currentIdentity.toString(),
                                        key: "uniqueKey",
                                        attributeCreationHints: {
                                            valueType: "ProprietaryString",
                                            title: "aTitle",
                                            confidentiality: RelationshipAttributeConfidentiality.Public
                                        }
                                    })
                                })
                            ]
                        } as IRequestItemGroup
                    ]
                },
                status: LocalRequestStatus.DecisionRequired
            });
            const validationResult = await When.iCallCanAcceptWith({
                items: [
                    {
                        accept: true
                    },
                    {
                        items: [
                            {
                                accept: true,
                                newAttribute: RelationshipAttribute.from({
                                    "@type": "RelationshipAttribute",
                                    owner: context.currentIdentity.toString(),
                                    key: "uniqueKey",
                                    confidentiality: RelationshipAttributeConfidentiality.Public,
                                    value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                                }).toJSON()
                            } as AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
                        ]
                    }
                ]
            });
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `The Request cannot be accepted with these parameters because it would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type.`
            });
        });

        test("returns 'error' on terminated relationship", async function () {
            await Given.aTerminatedRelationshipToIdentity();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanAccept();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'Terminated'."
            });
        });

        test("returns 'error' on relationship whose deletion is proposed", async function () {
            await Given.aDeletionProposedRelationshipToIdentity();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanAccept();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'DeletionProposed'."
            });
        });

        test("returns 'error' on relationship with peer which is in deletion", async function () {
            await Given.aRelationshipToPeerInDeletion();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanAccept();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.peerIsInDeletion",
                message: "You cannot decide a Request from peer 'did:e:a-domain:dids:anidentity' since the peer is in deletion."
            });
        });

        test("returns 'error' on relationship with peer which is deleted", async function () {
            await Given.aRelationshipToDeletedPeer();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanAccept();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'DeletionProposed'."
            });
        });
    });

    describe("CanReject", function () {
        test("returns 'success' on valid parameters", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iCallCanReject();
            await Then.itReturnsASuccessfulValidationResult();
        });

        test.each([
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCanReject: true
                        } as ITestRequestItem
                    ]
                } as IRequest,
                rejectParams: {
                    items: [
                        {
                            accept: false
                        }
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            },

            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem,
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCanReject: true
                        } as ITestRequestItem
                    ]
                } as IRequest,
                rejectParams: {
                    items: [
                        {
                            accept: false
                        },
                        {
                            accept: false
                        }
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            },

            {
                request: {
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanReject: true
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest,
                rejectParams: {
                    items: [
                        {
                            items: [
                                {
                                    accept: false
                                }
                            ]
                        }
                    ]
                } as Omit<DecideRequestParametersJSON, "requestId">
            }
        ])("returns 'error' when at least one RequestItem is invalid", async function (testParams) {
            await Given.anIncomingRequestWith({
                content: testParams.request,
                status: LocalRequestStatus.DecisionRequired
            });
            await When.iCallCanRejectWith(testParams.rejectParams);
            await Then.itReturnsAnErrorValidationResult();
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            await When.iTryToCallCanRejectWith({ requestId: "nonExistentId" });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToCallCanRejectWithoutARequestId();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*");
        });

        test("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToCallCanReject();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*");
        });

        test("returns a validation result that contains a sub result for each item", async function () {
            const request = {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    }),
                    RequestItemGroup.from({
                        items: [
                            TestRequestItem.from({
                                mustBeAccepted: false,
                                shouldFailAtCanReject: true
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: false
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: false,
                                shouldFailAtCanReject: true
                            })
                        ]
                    })
                ]
            } as IRequest;

            const rejectParams = {
                items: [
                    {
                        accept: false
                    },
                    {
                        accept: false,
                        items: [
                            {
                                accept: false
                            },
                            {
                                accept: false
                            },
                            {
                                accept: false
                            }
                        ]
                    }
                ]
            } as Omit<DecideRequestParametersJSON, "requestId">;

            await Given.anIncomingRequestWith({
                content: request,
                status: LocalRequestStatus.DecisionRequired
            });

            const validationResult = await When.iCallCanRejectWith(rejectParams);

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem",
                message: "Some child items have errors."
            });
            expect(validationResult.items).toHaveLength(2);

            expect(validationResult.items[0].isError()).toBe(false);

            expect(validationResult.items[1].isError()).toBe(true);
            expect(validationResult.items[1]).errorValidationResult({ code: "error.consumption.requests.validation.inheritedFromItem" });

            expect(validationResult.items[1].items).toHaveLength(3);
            expect(validationResult.items[1].items[0].isError()).toBe(true);
            expect(validationResult.items[1].items[1].isError()).toBe(false);
            expect(validationResult.items[1].items[2].isError()).toBe(true);
        });

        test("returns 'error' on terminated relationship", async function () {
            await Given.aTerminatedRelationshipToIdentity();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanReject();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'Terminated'."
            });
        });

        test("returns 'error' on relationship whose deletion is proposed", async function () {
            await Given.aDeletionProposedRelationshipToIdentity();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanReject();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'DeletionProposed'."
            });
        });

        test("returns 'error' on relationship with peer which is in deletion", async function () {
            await Given.aRelationshipToPeerInDeletion();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanReject();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.peerIsInDeletion",
                message: "You cannot decide a Request from peer 'did:e:a-domain:dids:anidentity' since the peer is in deletion."
            });
        });

        test("returns 'error' on relationship with peer which is deleted", async function () {
            await Given.aRelationshipToDeletedPeer();
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            const validationResult = await When.iCallCanReject();
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot decide a request from 'did:e:a-domain:dids:anidentity' since the relationship is in status 'DeletionProposed'."
            });
        });
    });

    describe("Accept", function () {
        test("can handle valid input", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iAcceptTheRequest();
            await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted);
            await Then.theRequestMovesToStatus(LocalRequestStatus.Decided);
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("creates Response Items and Groups with the correct structure", async function () {
            await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired);
            await When.iAcceptTheRequest({
                items: [
                    {
                        accept: true
                    },
                    {
                        items: [
                            {
                                accept: false
                            }
                        ]
                    }
                ]
            });
            await Then.iExpectTheResponseContent((responseContent) => {
                expect(responseContent.items).toHaveLength(2);
                expect(responseContent.items[0]).toBeInstanceOf(ResponseItem);
                expect(responseContent.items[1]).toBeInstanceOf(ResponseItemGroup);
                expect((responseContent.items[1] as ResponseItemGroup).items[0]).toBeInstanceOf(ResponseItem);
            });
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("creates Response Items with the correct result", async function () {
            await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired);
            await When.iAcceptTheRequest({
                items: [
                    {
                        accept: true
                    },
                    {
                        items: [
                            {
                                accept: false
                            }
                        ]
                    }
                ]
            });
            await Then.iExpectTheResponseContent((responseContent) => {
                const outerResponseItem = responseContent.items[0] as ResponseItem;
                expect(outerResponseItem.result).toStrictEqual(ResponseItemResult.Accepted);

                const responseGroup = responseContent.items[1] as ResponseItemGroup;
                const innerResponseItem = responseGroup.items[0];
                expect(innerResponseItem.result).toStrictEqual(ResponseItemResult.Rejected);
            });
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("throws when canAccept returns an error", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanAccept: true })]
                },
                status: LocalRequestStatus.DecisionRequired
            });
            await When.iTryToAccept();
            await Then.itThrowsAnErrorWithTheErrorMessage("Cannot accept the Request with the given parameters. Call 'canAccept' to get more information.");
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            await When.iTryToAcceptWith({ requestId: "nonExistentId" });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws when at least one RequestItemProcessor throws", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnAccept: true })]
                },
                status: LocalRequestStatus.DecisionRequired
            });

            await When.iTryToAccept();
            await Then.itThrowsAnErrorWithTheErrorMessage("An error occurred while processing a 'TestRequestItem'*Details: Accept failed for testing purposes*");
        });

        test("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToAccept();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToAcceptARequestWithoutItemsParameters();
            await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*");
        });
    });

    describe("Reject", function () {
        test("can handle valid input", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired);
            await When.iRejectTheRequest();
            await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Rejected);
            await Then.theRequestMovesToStatus(LocalRequestStatus.Decided);
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("creates Response Items and Groups with the correct structure", async function () {
            await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired);
            await When.iRejectTheRequest({
                items: [
                    {
                        accept: false,
                        code: "a.requestitem.error.code",
                        message: "A RequestItem error message"
                    },
                    {
                        items: [
                            {
                                accept: false,
                                code: "a.requestitemgroup.error.code",
                                message: "A RequestItemGroup error message"
                            }
                        ]
                    }
                ]
            });
            await Then.iExpectTheResponseContent((responseContent) => {
                expect(responseContent.items).toHaveLength(2);
                expect(responseContent.items[0]).toBeInstanceOf(RejectResponseItem);
                expect((responseContent.items[0] as RejectResponseItem).code).toBe("a.requestitem.error.code");
                expect((responseContent.items[0] as RejectResponseItem).message).toBe("A RequestItem error message");
                expect(responseContent.items[1]).toBeInstanceOf(ResponseItemGroup);
                expect((responseContent.items[1] as ResponseItemGroup).items).toHaveLength(1);
                expect((responseContent.items[1] as ResponseItemGroup).items[0]).toBeInstanceOf(RejectResponseItem);
                expect(((responseContent.items[1] as ResponseItemGroup).items[0] as RejectResponseItem).code).toBe("a.requestitemgroup.error.code");
                expect(((responseContent.items[1] as ResponseItemGroup).items[0] as RejectResponseItem).message).toBe("A RequestItemGroup error message");
            });
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("creates Response Items with the correct result", async function () {
            await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired);
            await When.iRejectTheRequest({
                items: [
                    {
                        accept: false
                    },
                    {
                        items: [
                            {
                                accept: false
                            }
                        ]
                    }
                ]
            });
            await Then.iExpectTheResponseContent((responseContent) => {
                const outerResponseItem = responseContent.items[0] as ResponseItem;
                expect(outerResponseItem.result).toStrictEqual(ResponseItemResult.Rejected);

                const responseGroup = responseContent.items[1] as ResponseItemGroup;
                const innerResponseItem = responseGroup.items[0];
                expect(innerResponseItem.result).toStrictEqual(ResponseItemResult.Rejected);
            });
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Decided
            });
        });

        test("throws when canReject returns an error", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanReject: true })]
                },
                status: LocalRequestStatus.DecisionRequired
            });
            await When.iTryToReject();
            await Then.itThrowsAnErrorWithTheErrorMessage("Cannot reject the Request with the given parameters. Call 'canReject' to get more information.");
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            await When.iTryToRejectWith({ requestId: "nonExistentId" });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws when at least one RequestItemProcessor throws", async function () {
            await Given.anIncomingRequestWith({
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnReject: true })]
                },
                status: LocalRequestStatus.DecisionRequired
            });

            await When.iTryToReject();
            await Then.itThrowsAnErrorWithTheErrorMessage("An error occurred while processing a 'TestRequestItem'*Details: Reject failed for testing purposes*");
        });

        test("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToReject();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*");
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToAcceptARequestWithoutItemsParameters();
            await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*");
        });
    });

    describe("Complete", function () {
        test("can handle valid input with a Message as responseSource", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Decided);
            await When.iCompleteTheIncomingRequestWith({
                responseSourceObject: TestObjectFactory.createOutgoingIMessage(context.currentIdentity)
            });
            await Then.theRequestMovesToStatus(LocalRequestStatus.Completed);
            await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" });
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Completed
            });
        });

        test("can handle valid input with a Relationship as responseSource", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Decided);
            const outgoingRelationship = TestObjectFactory.createPendingRelationship();
            await When.iCompleteTheIncomingRequestWith({
                responseSourceObject: outgoingRelationship
            });
            await Then.theRequestMovesToStatus(LocalRequestStatus.Completed);
            await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Relationship" });
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Completed
            });
        });

        test("can handle valid input without a responseSource for a RelationshipTemplate", async function () {
            await Given.aRejectedIncomingRequestFromARelationshipTemplate();
            await When.iCompleteTheIncomingRequestWith({});
            await Then.theRequestMovesToStatus(LocalRequestStatus.Completed);
            await Then.theResponseHasItsSourcePropertyNotSet();
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(IncomingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Completed
            });
        });

        test("throws when the Local Request is not in status 'Decided'", async function () {
            await Given.anIncomingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToCompleteTheIncomingRequest();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Decided'*");
        });

        test("throws when no Local Request with the given id exists in DB", async function () {
            const nonExistentId = CoreId.from("nonExistentId");
            await When.iTryToCompleteTheIncomingRequestWith({ requestId: nonExistentId });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });
    });

    describe("GetRequest", function () {
        test("returns the Request with the given id if it exists", async function () {
            const requestId = await ConsumptionIds.request.generate();
            await Given.anIncomingRequestWith({ id: requestId });
            await When.iGetTheIncomingRequestWith(requestId);
            await Then.theReturnedRequestHasTheId(requestId);
        });

        test("returns undefined when the given id does not exist", async function () {
            const aNonExistentId = await ConsumptionIds.request.generate();
            await When.iGetTheIncomingRequestWith(aNonExistentId);
            await Then.iExpectUndefinedToBeReturned();
        });

        test("returns undefined when the given id belongs to an outgoing Request", async function () {
            await Given.anActiveRelationshipToIdentity();
            const outgoingRequest = await Given.anOutgoingRequest();
            await When.iGetTheIncomingRequestWith(outgoingRequest.id);
            await Then.iExpectUndefinedToBeReturned();
        });

        test("moves the Request to status 'Expired' when expiredAt is reached", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().subtract({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetTheIncomingRequestWith(outgoingRequest.id);
            await Then.theRequestIsInStatus(LocalRequestStatus.Expired);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not reached", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetTheIncomingRequestWith(outgoingRequest.id);
            await Then.theRequestIsInStatus(LocalRequestStatus.Open);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not set", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetTheIncomingRequestWith(outgoingRequest.id);
            await Then.theRequestIsInStatus(LocalRequestStatus.Open);
        });
    });

    describe("GetIncomingRequests", function () {
        test("returns all incoming Requests when invoked with no query", async function () {
            await Given.anIncomingRequest();
            await Given.anIncomingRequest();
            await When.iGetIncomingRequestsWithTheQuery({});
            await Then.theNumberOfReturnedRequestsIs(2);
        });

        test("does not return outgoing Requests", async function () {
            await Given.anActiveRelationshipToIdentity();
            await Given.anIncomingRequest();
            await Given.anOutgoingRequest();
            await When.iGetIncomingRequestsWithTheQuery({});
            await Then.theNumberOfReturnedRequestsIs(1);
        });

        test("filters Requests based on given query", async function () {
            await Given.anIncomingRequestWith({ status: LocalRequestStatus.Open });
            await Given.anIncomingRequestWith({ status: LocalRequestStatus.Open });
            await Given.anIncomingRequestWith({ status: LocalRequestStatus.DecisionRequired });
            await When.iGetIncomingRequestsWithTheQuery({ status: LocalRequestStatus.Open });
            await Then.theNumberOfReturnedRequestsIs(2);
        });

        test("moves the Request to status 'Expired' when expiredAt is reached", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().subtract({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetIncomingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Expired);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not reached", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetIncomingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Open);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not set", async function () {
            const outgoingRequest = await Given.anIncomingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetIncomingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Open);
        });
    });

    describe("Flows for incoming Requests", function () {
        test("Incoming Request via RelationshipTemplate", async function () {
            const request = Request.from({
                items: [TestRequestItem.from({ mustBeAccepted: false })]
            });
            const template = TestObjectFactory.createIncomingIRelationshipTemplate();

            let cnsRequest = await context.incomingRequestsController.received({
                receivedRequest: request,
                requestSourceObject: template
            });

            cnsRequest = await context.incomingRequestsController.checkPrerequisites({
                requestId: cnsRequest.id
            });

            cnsRequest = await context.incomingRequestsController.requireManualDecision({
                requestId: cnsRequest.id
            });
            cnsRequest = await context.incomingRequestsController.accept({
                requestId: cnsRequest.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            });

            const relationship = TestObjectFactory.createPendingRelationship();

            cnsRequest = await context.incomingRequestsController.complete({
                requestId: cnsRequest.id,
                responseSourceObject: relationship
            });

            expect(cnsRequest).toBeDefined();

            await Then.eventsHaveBeenPublished(
                IncomingRequestReceivedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent
            );
        });

        test("Incoming Request via Message", async function () {
            const request = Request.from({
                id: await CoreIdHelper.notPrefixed.generate(),
                items: [TestRequestItem.from({ mustBeAccepted: false })]
            });
            const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity);

            let cnsRequest = await context.incomingRequestsController.received({
                receivedRequest: request,
                requestSourceObject: incomingMessage
            });

            cnsRequest = await context.incomingRequestsController.checkPrerequisites({
                requestId: cnsRequest.id
            });

            cnsRequest = await context.incomingRequestsController.requireManualDecision({
                requestId: cnsRequest.id
            });
            cnsRequest = await context.incomingRequestsController.accept({
                requestId: cnsRequest.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            });

            const responseMessage = TestObjectFactory.createOutgoingIMessage(context.currentIdentity);

            cnsRequest = await context.incomingRequestsController.complete({
                requestId: cnsRequest.id,
                responseSourceObject: responseMessage
            });

            expect(cnsRequest).toBeDefined();

            await Then.eventsHaveBeenPublished(
                IncomingRequestReceivedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent,
                IncomingRequestStatusChangedEvent
            );
        });
    });
});
