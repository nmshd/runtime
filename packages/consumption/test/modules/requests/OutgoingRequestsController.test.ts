import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ApplicationError, sleep } from "@js-soft/ts-utils";
import {
    ConsumptionIds,
    ErrorValidationResult,
    ICreateOutgoingRequestParameters,
    IRequestWithoutId,
    LocalRequestStatus,
    OutgoingRequestCreatedAndCompletedEvent,
    OutgoingRequestCreatedEvent,
    OutgoingRequestStatusChangedEvent,
    ValidationResult
} from "@nmshd/consumption";
import {
    CreateAttributeRequestItem,
    IAcceptResponseItem,
    IRequest,
    IRequestItemGroup,
    IResponse,
    IResponseItemGroup,
    ProposeAttributeRequestItem,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    RelationshipTemplateContent,
    RequestItemGroup,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { TestUtil, loggerFactory } from "../../core/TestUtil.js";
import { RequestsGiven, RequestsTestsContext, RequestsThen, RequestsWhen } from "./RequestsIntegrationTest.js";
import { TestObjectFactory } from "./testHelpers/TestObjectFactory.js";
import { ITestRequestItem, TestRequestItem } from "./testHelpers/TestRequestItem.js";

let context: RequestsTestsContext;

describe("OutgoingRequestsController", function () {
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

    describe("CanCreate (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("returns 'success' on valid parameters", async function () {
            await When.iCallCanCreateForAnOutgoingRequest();
            await Then.itReturnsASuccessfulValidationResult();
        });

        test.each([
            {
                params: {
                    isPersonalized: true,
                    peer: CoreId.from("")
                },
                expectedErrorMessage: "*content*Value is not defined*"
            },
            {
                params: {
                    isPersonalized: true,
                    peer: CoreId.from(""),
                    content: {}
                },
                expectedErrorMessage: "*Request.items*Value is not defined*"
            }
        ])("throws on syntactically invalid input", async function (testParams) {
            await When.iTryToCallCanCreateForAnOutgoingRequest(testParams.params as unknown as ICreateOutgoingRequestParameters);
            await Then.itThrowsAnErrorWithTheErrorMessage(testParams.expectedErrorMessage);
        });

        test.each([
            {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false,
                        shouldFailAtCanCreateOutgoingRequestItem: true
                    } as ITestRequestItem
                ]
            } as IRequest,
            {
                items: [
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false
                    } as ITestRequestItem,
                    {
                        "@type": "TestRequestItem",
                        mustBeAccepted: false,
                        shouldFailAtCanCreateOutgoingRequestItem: true
                    } as ITestRequestItem
                ]
            } as IRequest,
            {
                items: [
                    {
                        "@type": "RequestItemGroup",
                        items: [
                            {
                                "@type": "TestRequestItem",
                                mustBeAccepted: false,
                                shouldFailAtCanCreateOutgoingRequestItem: true
                            } as ITestRequestItem
                        ]
                    } as IRequestItemGroup
                ]
            } as IRequest
        ])("returns 'error' when at least one RequestItem is invalid", async function (request: IRequestWithoutId) {
            await When.iCallCanCreateForAnOutgoingRequest({
                content: request
            });
            await Then.itReturnsAnErrorValidationResult();
        });

        test("returns a validation result that contains each error (simple)", async function () {
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false,
                            shouldFailAtCanCreateOutgoingRequestItem: true
                        }),
                        TestRequestItem.from({
                            mustBeAccepted: false,
                            shouldFailAtCanCreateOutgoingRequestItem: true
                        })
                    ]
                }
            });
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem",
                message: "Some child items have errors."
            });
            expect(validationResult.items).toHaveLength(2);

            expect(validationResult.items[0].isError()).toBe(true);
            expect((validationResult.items[0] as ErrorValidationResult).error.code).toBe("aCode");
            expect((validationResult.items[0] as ErrorValidationResult).error.message).toBe("aMessage");

            expect(validationResult.items[1].isError()).toBe(true);
            expect((validationResult.items[1] as ErrorValidationResult).error.code).toBe("aCode");
            expect((validationResult.items[1] as ErrorValidationResult).error.message).toBe("aMessage");
        });

        test("returns a validation result that contains each error (complex)", async function () {
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false
                        }),
                        RequestItemGroup.from({
                            items: [
                                TestRequestItem.from({
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                })
                            ]
                        })
                    ]
                }
            });
            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem",
                message: "Some child items have errors."
            });
            expect(validationResult.items).toHaveLength(2);

            expect(validationResult.items[0].isError()).toBe(false);

            expect(validationResult.items[1].isError()).toBe(true);
            expect((validationResult.items[1] as ErrorValidationResult).error.code).toBe("error.consumption.requests.validation.inheritedFromItem");
            expect((validationResult.items[1] as ErrorValidationResult).error.message).toBe("Some child items have errors.");

            expect(validationResult.items[1].items).toHaveLength(1);
            expect(validationResult.items[1].items[0].isError()).toBe(true);
        });

        test("returns a validation result that contains an error for requests to myself", async function () {
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false
                        }),
                        RequestItemGroup.from({
                            items: [
                                TestRequestItem.from({
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                })
                            ]
                        })
                    ]
                },
                peer: context.currentIdentity.address
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.cannotShareRequestWithYourself",
                message: "You cannot share a Request with yourself."
            });
        });

        test("returns a validation result that contains an error for requests that are expired", async function () {
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    expiresAt: CoreDate.utc().subtract({ days: 1 }),
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false
                        })
                    ]
                }
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.cannotCreateRequestWithExpirationDateInPast",
                message: "You cannot create a Request with an expiration date that is in the past."
            });
        });

        test("returns a validation result that contains an error for requests that would lead to the creation of more than one RelationshipAttribute with the same key", async function () {
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        CreateAttributeRequestItem.from({
                            mustBeAccepted: true,
                            attribute: RelationshipAttribute.from({
                                "@type": "RelationshipAttribute",
                                owner: "did:e:a-domain:dids:anidentity",
                                key: "uniqueKey",
                                confidentiality: RelationshipAttributeConfidentiality.Public,
                                value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                            })
                        }),
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                ProposeAttributeRequestItem.from({
                                    mustBeAccepted: true,
                                    query: RelationshipAttributeQuery.from({
                                        owner: "",
                                        key: "uniqueKey",
                                        attributeCreationHints: {
                                            valueType: "ProprietaryString",
                                            title: "aTitle",
                                            confidentiality: RelationshipAttributeConfidentiality.Public
                                        }
                                    }),
                                    attribute: RelationshipAttribute.from({
                                        "@type": "RelationshipAttribute",
                                        owner: "",
                                        key: "uniqueKey",
                                        confidentiality: RelationshipAttributeConfidentiality.Public,
                                        value: ProprietaryString.from({ title: "aTitle", value: "aStringValue" }).toJSON()
                                    })
                                })
                            ]
                        } as IRequestItemGroup
                    ]
                },
                peer: "did:e:a-domain:dids:anidentity"
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.violatedKeyUniquenessOfRelationshipAttributes",
                message:
                    "The Request cannot be created because its acceptance would lead to the creation of more than one RelationshipAttribute in the context of this Relationship with the same key 'uniqueKey', owner and value type."
            });
        });
    });

    describe("CanCreate (on terminated relationship)", function () {
        test("returns a validation result that contains an error if the relationship is terminated", async function () {
            await Given.aTerminatedRelationshipToIdentity();
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false,
                            shouldFailAtCanCreateOutgoingRequestItem: true
                        })
                    ]
                }
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot create a request to 'did:e:a-domain:dids:anidentity' since the relationship is in status 'Terminated'"
            });
        });
    });

    describe("CanCreate (with peer in deletion or deleted peer)", function () {
        test("returns a validation result that contains an error for requests to a peer which is in deletion", async function () {
            await Given.aRelationshipToPeerInDeletion();
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false,
                            shouldFailAtCanCreateOutgoingRequestItem: true
                        })
                    ]
                }
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.peerIsInDeletion",
                message: "You cannot create a Request to peer 'did:e:a-domain:dids:anidentity' since the peer is in deletion."
            });
        });

        test("returns a validation result that contains an error for requests to a peer which is deleted", async function () {
            await Given.aRelationshipToDeletedPeer();
            const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                content: {
                    items: [
                        TestRequestItem.from({
                            mustBeAccepted: false,
                            shouldFailAtCanCreateOutgoingRequestItem: true
                        })
                    ]
                }
            });

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.wrongRelationshipStatus",
                message: "You cannot create a request to 'did:e:a-domain:dids:anidentity' since the relationship is in status 'DeletionProposed'."
            });
        });
    });

    describe("Create (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("can handle valid input", async function () {
            await When.iCreateAnOutgoingRequest();
            await Then.theCreatedOutgoingRequestHasAllProperties();
            await Then.theRequestIsInStatus(LocalRequestStatus.Draft);
            await Then.theRequestDoesNotHaveSourceSet();
            await Then.theNewRequestIsPersistedInTheDatabase();
            await Then.eventHasBeenPublished(OutgoingRequestCreatedEvent);
        });

        test("calls canCreate", async function () {
            await When.iCreateAnOutgoingRequest();
            await Then.canCreateIsBeingCalled();
            await Then.eventHasBeenPublished(OutgoingRequestCreatedEvent);
        });

        test("throws on syntactically invalid input", async function () {
            await When.iTryToCreateAnOutgoingRequestWithoutContent();
            await Then.itThrowsAnErrorWithTheErrorMessage("*content*Value is not defined*");
        });

        test("throws that it is necessary to call 'canCreate' when at least one RequestItem is invalid", async function () {
            await When.iTryToCreateAnOutgoingRequestWithIncorrectRequestItem();
            await Then.itThrowsAnErrorWithTheErrorMessage("Some child items have errors. Call 'canCreate' to get more information.");
        });

        test("throws when canCreate returns an error", async function () {
            const oldCanCreate = context.outgoingRequestsController.canCreate;
            context.outgoingRequestsController.canCreate = (_: ICreateOutgoingRequestParameters) => {
                return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")));
            };

            await When.iTryToCreateAnOutgoingRequest();
            await Then.itThrowsAnErrorWithTheErrorMessage("aMessage");

            context.outgoingRequestsController.canCreate = oldCanCreate;
        });
    });

    describe("CreateFromRelationshipTemplateResponse", function () {
        describe("with a RelationshipCreation", function () {
            test("combines calls to create, sent and complete", async function () {
                await When.iCreateAnOutgoingRequestFromRelationshipCreation();
                await Then.theCreatedOutgoingRequestHasAllProperties();
                await Then.theRequestIsInStatus(LocalRequestStatus.Completed);
                await Then.theRequestHasItsSourcePropertySet();
                await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted);
                await Then.theResponseHasItsSourcePropertySetCorrectly({
                    responseSourceType: "Relationship"
                });
                await Then.theNewRequestIsPersistedInTheDatabase();
                await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
            });

            test("uses the id from the response for the created Local Request", async function () {
                await When.iCreateAnOutgoingRequestFromRelationshipCreationWith({
                    responseSource: TestObjectFactory.createPendingRelationship(),
                    response: TestObjectFactory.createResponse("requestIdReceivedFromPeer")
                });

                await Then.theRequestHasTheId("requestIdReceivedFromPeer");
                await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
                await Then.theRequestHasCorrectItemCount(1);
            });

            test("create an outgoing request from relationship creation with an active relationship", async function () {
                await When.iCreateAnOutgoingRequestFromRelationshipCreationWith({
                    template: TestObjectFactory.createOutgoingIRelationshipTemplate(
                        context.currentIdentity,
                        RelationshipTemplateContent.from({
                            onNewRelationship: TestObjectFactory.createRequestWithOneItem()
                        })
                    ),
                    responseSource: TestObjectFactory.createPendingRelationship(),
                    response: TestObjectFactory.createResponse("requestIdReceivedFromPeer")
                });

                await Then.theRequestHasTheId("requestIdReceivedFromPeer");
                await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
                await Then.theRequestHasCorrectItemCount(1);
            });

            test("throws on syntactically invalid input", async function () {
                await When.iTryToCreateAnOutgoingRequestFromRelationshipTemplateResponseWithoutResponseSource();
                await Then.itThrowsAnErrorWithTheErrorMessage("*responseSource*Value is not defined*");
            });
        });

        test("uses the content from onExistingRelationship when the relationship exists", async function () {
            await When.iCreateAnOutgoingRequestFromRelationshipCreationWhenRelationshipExistsWith({
                responseSource: TestObjectFactory.createIncomingIMessageWithResponse(CoreAddress.from("did:e:a-domain:dids:anidentity"), "requestIdReceivedFromPeer"),
                response: TestObjectFactory.createResponse("requestIdReceivedFromPeer")
            });
            await Then.theRequestHasTheId("requestIdReceivedFromPeer");
            await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
            await Then.theRequestHasCorrectItemCount(2);
        });

        describe("with a Message (on active relationship)", function () {
            beforeEach(async function () {
                await Given.anActiveRelationshipToIdentity();
            });

            test("combines calls to create, sent and complete", async function () {
                await When.iCreateAnOutgoingRequestFromMessage();
                await Then.theCreatedOutgoingRequestHasAllProperties();
                await Then.theRequestIsInStatus(LocalRequestStatus.Completed);
                await Then.theRequestHasItsSourcePropertySet();
                await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted);
                await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" });
                await Then.theNewRequestIsPersistedInTheDatabase();
                await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
            });

            test("uses the id from the Message content for the created Local Request", async function () {
                await When.iCreateAnOutgoingRequestFromMessageWith({
                    responseSource: TestObjectFactory.createIncomingIMessageWithResponse(
                        CoreAddress.from("did:e:a-domain:dids:anidentity"),
                        CoreId.from("requestIdReceivedFromPeer")
                    ),
                    response: TestObjectFactory.createResponse("requestIdReceivedFromPeer")
                });
                await Then.theRequestHasTheId("requestIdReceivedFromPeer");
                await Then.eventsHaveBeenPublished(OutgoingRequestCreatedAndCompletedEvent);
            });

            test("throws on syntactically invalid input", async function () {
                await When.iTryToCreateAnOutgoingRequestFromRelationshipTemplateResponseWithoutResponseSource();
                await Then.itThrowsAnErrorWithTheErrorMessage("*responseSource*Value is not defined*");
            });
        });
    });

    describe("Sent (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("can handle valid input", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iCallSent();
            await Then.theRequestMovesToStatus(LocalRequestStatus.Open);
            await Then.theRequestHasItsSourcePropertySet();
            await Then.theChangesArePersistedInTheDatabase();
            await Then.eventHasBeenPublished(OutgoingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Open
            });
        });

        test("throws on syntactically invalid input", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iTryToCallSentWithoutSourceObject();
            await Then.itThrowsAnErrorWithTheErrorMessage("*requestSourceObject*Value is not defined*");
        });

        test("throws when the Local Request is not in status 'Draft' ", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToCallSent();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Draft'*");
        });

        test("sets the source property depending on the given source", async function () {
            const source = TestObjectFactory.createOutgoingIMessage(context.currentIdentity);
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iCallSentWith({ requestSourceObject: source });
            await Then.theRequestHasItsSourcePropertySetTo({
                type: "Message",
                reference: source.id
            });
            await Then.eventHasBeenPublished(OutgoingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Open
            });
        });

        test("throws when no Request with the given id exists in DB", async function () {
            await When.iTryToCallSentWith({ requestId: CoreId.from("nonExistentId") });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws when passing an incoming Message", async function () {
            const invalidSource = TestObjectFactory.createIncomingIMessage(context.currentIdentity);
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iTryToCallSentWith({ requestSourceObject: invalidSource });
            await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create outgoing Request from a peer*");
        });

        test("sets deletionInfo in case of DeleteAttributeRequestItems", async function () {
            await When.iSentAnOutgoingRequestWithDeleteAttributeRequestItems();
            await Then.theDeletionInfoOfTheAssociatedAttributesAndPredecessorsIsSet();
        });
    });

    describe("Complete (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("can handle valid input with a Message as responseSourceObject", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open);
            const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity);
            await When.iCompleteTheOutgoingRequestWith({
                responseSourceObject: incomingMessage
            });
            await Then.theRequestMovesToStatus(LocalRequestStatus.Completed);
            await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted);
            await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" });
            await Then.theNewRequestIsPersistedInTheDatabase();
            await Then.eventHasBeenPublished(OutgoingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Completed
            });
        });

        test.each([
            // 1 item
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem
                    ]
                } as IRequest,
                response: {
                    result: ResponseResult.Accepted,
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IAcceptResponseItem
                    ]
                } as Omit<IResponse, "id">,
                numberOfCalls: 1
            },
            // 2 items
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem,
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem
                    ]
                } as IRequest,
                response: {
                    result: ResponseResult.Accepted,
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IAcceptResponseItem,
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IAcceptResponseItem
                    ]
                } as Omit<IResponse, "id">,
                numberOfCalls: 2
            },
            // 1 item and 1 group with 1 item
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false
                        } as ITestRequestItem,
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest,
                response: {
                    result: ResponseResult.Accepted,
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IAcceptResponseItem,
                        {
                            "@type": "ResponseItemGroup",
                            items: [
                                {
                                    "@type": "AcceptResponseItem",
                                    result: ResponseItemResult.Accepted
                                } as IAcceptResponseItem
                            ]
                        } as IResponseItemGroup
                    ]
                } as Omit<IResponse, "id">,
                numberOfCalls: 2
            }
        ])("calls applyIncomingResponseItem on the RequestItemProcessor of RequestItems", async function (testParams) {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Open,
                content: testParams.request
            });
            await When.iCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response });
            await Then.applyIncomingResponseItemIsCalledOnTheRequestItemProcessor(testParams.numberOfCalls);
            await Then.eventHasBeenPublished(OutgoingRequestStatusChangedEvent, {
                newStatus: LocalRequestStatus.Completed
            });
        });

        test.each([
            // 1 item with error
            {
                request: {
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: false,
                            shouldFailAtCanApplyIncomingResponseItem: true
                        } as ITestRequestItem
                    ]
                } as IRequest,
                response: {
                    result: ResponseResult.Accepted,
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IAcceptResponseItem
                    ]
                } as Omit<IResponse, "id">
            },
            // 1 item group with 1 item with error
            {
                request: {
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanApplyIncomingResponseItem: true
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest,
                response: {
                    result: ResponseResult.Accepted,
                    items: [
                        {
                            "@type": "ResponseItemGroup",
                            items: [
                                {
                                    "@type": "AcceptResponseItem",
                                    result: ResponseItemResult.Accepted
                                } as IAcceptResponseItem
                            ]
                        } as IResponseItemGroup
                    ]
                } as Omit<IResponse, "id">
            }
        ])("throws when an ItemProcessor returns an error validation result", async function (testParams) {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Open,
                content: testParams.request
            });
            await When.iTryToCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response });
            await Then.itThrowsAnErrorWithTheErrorMessage("aMessage");
        });

        test("throws on syntactically invalid input", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToCallCompleteWithoutSourceObject();
            await Then.itThrowsAnErrorWithTheErrorMessage("*responseSourceObject*Value is not defined*");
        });

        test("throws when no Request with the given id exists in DB", async function () {
            await When.iTryToCompleteTheOutgoingRequestWith({ requestId: CoreId.from("nonExistentId") });
            await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound");
        });

        test("throws when the Local Request is not in status 'Open/Expired'", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iTryToCompleteTheOutgoingRequest();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Open/Expired'*");
        });

        test("allows completing an expired Request with a Message that was created before the expiry date", async function () {
            const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity, CoreDate.utc().subtract({ days: 2 }));
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Expired,
                content: {
                    expiresAt: CoreDate.utc().add({ millisecond: 100 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });
            await sleep(150);

            await When.iCompleteTheOutgoingRequestWith({ responseSourceObject: incomingMessage });
            await Then.theRequestMovesToStatus(LocalRequestStatus.Completed);
        });

        test("throws when trying to complete an expired Request with a Message that was created after the expiry date", async function () {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Expired,
                content: {
                    expiresAt: CoreDate.utc().add({ millisecond: 100 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });
            await sleep(150);

            const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity);
            await When.iTryToCompleteTheOutgoingRequestWith({ responseSourceObject: incomingMessage });
            await Then.itThrowsAnErrorWithTheErrorMessage("*Cannot complete an expired request with a response that was created before the expiration date*");
        });
    });

    describe("Get (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("returns the Request with the given id if it exists", async function () {
            const outgoingRequest = await Given.anOutgoingRequest();
            await When.iGetTheOutgoingRequest();
            await Then.theReturnedRequestHasTheId(outgoingRequest.id);
        });

        test("moves the Request to status 'Expired' when expiredAt is reached", async function () {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ millisecond: 100 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });
            await sleep(150);

            await When.iGetTheOutgoingRequest();
            await Then.theRequestIsInStatus(LocalRequestStatus.Expired);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not reached", async function () {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetTheOutgoingRequest();
            await Then.theRequestIsInStatus(LocalRequestStatus.Draft);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not set", async function () {
            await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetTheOutgoingRequest();
            await Then.theRequestIsInStatus(LocalRequestStatus.Draft);
        });

        test("returns undefined when the given id does not exist", async function () {
            const aNonExistentId = await ConsumptionIds.request.generate();
            await When.iGetTheOutgoingRequestWith(aNonExistentId);
            await Then.iExpectUndefinedToBeReturned();
        });

        test("returns undefined when the given id belongs to an outgoing Request", async function () {
            const theIdOfTheRequest = await ConsumptionIds.request.generate();
            await Given.anIncomingRequestWith({ id: theIdOfTheRequest });
            await When.iGetTheOutgoingRequestWith(theIdOfTheRequest);
            await Then.iExpectUndefinedToBeReturned();
        });
    });

    describe("GetOutgoingRequests (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("returns all outgoing Requests when invoked with no query", async function () {
            await Given.anOutgoingRequest();
            await Given.anOutgoingRequest();
            await When.iGetOutgoingRequestsWithTheQuery({});
            await Then.theNumberOfReturnedRequestsIs(2);
        });

        test("does not return outgoing Requests", async function () {
            await Given.anOutgoingRequest();
            await Given.anIncomingRequest();
            await When.iGetOutgoingRequestsWithTheQuery({});
            await Then.theNumberOfReturnedRequestsIs(1);
        });

        test("filters Requests based on given query", async function () {
            await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Draft });
            await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Draft });
            await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Open });
            await When.iGetOutgoingRequestsWithTheQuery({ status: LocalRequestStatus.Draft });
            await Then.theNumberOfReturnedRequestsIs(2);
        });

        test("moves the Request to status 'Expired' when expiredAt is reached", async function () {
            const outgoingRequest = await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ millisecond: 100 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });
            await sleep(150);

            await When.iGetOutgoingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Expired);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not reached", async function () {
            const outgoingRequest = await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    expiresAt: CoreDate.utc().add({ days: 1 }),
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetOutgoingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Draft);
        });

        test("doesn't move the Request to status 'Expired' when expiredAt is not set", async function () {
            const outgoingRequest = await Given.anOutgoingRequestWith({
                status: LocalRequestStatus.Draft,
                content: {
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                }
            });

            await When.iGetOutgoingRequestsWithTheQuery({ id: outgoingRequest.id.toString() });
            await Then.theOnlyReturnedRequestIsInStatus(LocalRequestStatus.Draft);
        });
    });

    describe("Discard (on active relationship)", function () {
        beforeEach(async function () {
            await Given.anActiveRelationshipToIdentity();
        });

        test("discards a Request in status Draft", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft);
            await When.iDiscardTheOutgoingRequest();
            await Then.theRequestIsDeleted();
        });

        test("errors when the request is in status Open", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open);
            await When.iTryToDiscardTheOutgoingRequest();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Draft'*");
        });

        test("errors when the request is in status Completed", async function () {
            await Given.anOutgoingRequestInStatus(LocalRequestStatus.Completed);
            await When.iTryToDiscardTheOutgoingRequest();
            await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Draft'*");
        });
    });
});
