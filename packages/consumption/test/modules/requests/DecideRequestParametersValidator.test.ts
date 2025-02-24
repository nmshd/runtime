import { Request, RequestItemGroup } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreIdHelper } from "@nmshd/transport";
import {
    DecideRequestItemGroupParametersJSON,
    DecideRequestItemParametersJSON,
    DecideRequestParametersValidator,
    ErrorValidationResult,
    LocalRequest,
    LocalRequestStatus
} from "../../../src";
import { TestObjectFactory } from "./testHelpers/TestObjectFactory";
import { TestRequestItem } from "./testHelpers/TestRequestItem";

interface TestParam {
    description: string;
    input: {
        request: Request;
        response: {
            requestId: string;
            items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];
            accept: boolean;
        };
    };
    expectedError?: {
        indexPath?: number[];
        code: string;
        message: string;
    };
}

let validator: DecideRequestParametersValidator;

const requestId = "requestId";

beforeEach(function () {
    validator = new DecideRequestParametersValidator();
});

describe("DecideRequestParametersValidator", function () {
    describe("validateRequest", function () {
        const errorParams: TestParam[] = [
            {
                description: "(1) error: Request with two RequestItems is answered with one item",
                input: {
                    request: TestObjectFactory.createRequestWithTwoItems(),
                    response: {
                        accept: true,
                        items: [{ accept: true }],
                        requestId
                    }
                },
                expectedError: {
                    code: "error.consumption.requests.decide.validation.invalidNumberOfItems",
                    message: "The number of items in the Request and the Response do not match."
                }
            },
            {
                description: "(2) error: Request with one RequestItem is answered with two items",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(),
                    response: {
                        accept: true,
                        items: [{ accept: true }, { accept: true }],
                        requestId
                    }
                },
                expectedError: {
                    code: "error.consumption.requests.decide.validation.invalidNumberOfItems",
                    message: "The number of items in the Request and the Response do not match."
                }
            }
        ];

        test.each(errorParams)("$description", async function (data) {
            const localRequest = LocalRequest.from({
                id: CoreId.from(requestId),
                content: data.input.request,
                createdAt: CoreDate.utc(),
                isOwn: true,
                peer: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                source: { reference: await CoreIdHelper.notPrefixed.generate(), type: "Message" },
                status: LocalRequestStatus.Open,
                statusLog: []
            });

            const validationResult = validator.validateRequest(data.input.response, localRequest);

            if (!data.expectedError) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                    validationResult.isError(),
                    `expected success, but received the error '${
                        validationResult.isError() ? validationResult.error.code : ""
                    } - ${validationResult.isError() ? validationResult.error.message : ""}'`
                ).toBe(false);
                return;
            }

            expect(validationResult.isError(), "expected an error, but received success").toBe(true);
            if (!validationResult.isError()) throw new Error();

            const errorIndexPath = data.expectedError.indexPath;
            if (!errorIndexPath) {
                // no error path provided, so we expect the error to be at the root
                // eslint-disable-next-line jest/no-conditional-expect
                expect(validationResult.error.code).toStrictEqual(data.expectedError.code);
                // eslint-disable-next-line jest/no-conditional-expect
                expect(validationResult.error.message).toStrictEqual(data.expectedError.message);
                return;
            }

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem"
            });

            let childResult = validationResult;
            for (const index of errorIndexPath) childResult = childResult.items[index] as ErrorValidationResult;

            expect(childResult.isError(), "expected an error, but received success").toBe(true);
            if (!childResult.isError()) throw new Error();

            expect(childResult.error.code).toStrictEqual(data.expectedError.code);
            expect(childResult.error.message).toStrictEqual(data.expectedError.message);
        });
    });

    describe("validateItems", function () {
        const successParams: TestParam[] = [
            {
                description: "(1) success: accept Request with one RequestItem and accept the RequestItem",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(),
                    response: {
                        accept: true,
                        items: [{ accept: true }],
                        requestId
                    }
                }
            },
            {
                description: "(2) success: accept Request with RequestItemGroup and accept the contained RequestItem",
                input: {
                    request: TestObjectFactory.createRequestWithOneItemGroup(),
                    response: {
                        accept: true,
                        items: [{ items: [{ accept: true }] }],
                        requestId
                    }
                }
            },
            {
                description: "(3) success: accept Request with one RequestItem and reject the RequestItem",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(),
                    response: {
                        accept: true,
                        items: [{ accept: false }],
                        requestId
                    }
                }
            },
            {
                description: "(4) success: accept Request with RequestItemGroup and reject the contained RequestItem",
                input: {
                    request: TestObjectFactory.createRequestWithOneItemGroup(),
                    response: {
                        accept: true,
                        items: [{ items: [{ accept: false }] }],
                        requestId
                    }
                }
            },
            {
                description: "(5) success: accept a Request without accepting any RequestItem (no RequestItems mustBeAccepted)",
                input: {
                    request: Request.from({
                        items: [TestRequestItem.from({ mustBeAccepted: false })]
                    }),
                    response: {
                        accept: true,
                        items: [{ accept: false }],
                        requestId
                    }
                }
            },
            {
                description: "(6) success: RequestItems that must not be accepted in a RequestItemGroup are rejected",
                input: {
                    request: Request.from({
                        items: [
                            RequestItemGroup.from({
                                items: [TestRequestItem.from({ mustBeAccepted: false }), TestRequestItem.from({ mustBeAccepted: true })]
                            })
                        ]
                    }),
                    response: {
                        accept: true,
                        items: [
                            {
                                items: [{ accept: false }, { accept: true }]
                            }
                        ],
                        requestId
                    }
                }
            }
        ];

        const errorParams: TestParam[] = [
            {
                description: "(1) error: Request with one RequestItemGroup is answered as a RequestItem",
                input: {
                    request: TestObjectFactory.createRequestWithOneItemGroup(),
                    response: {
                        accept: true,
                        items: [{ accept: true }],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.decide.validation.requestItemGroupAnsweredAsRequestItem",
                    message: "The RequestItemGroup was answered as a RequestItem."
                }
            },
            {
                description: "(2) error: Request with one RequestItem is answered as a RequestItemGroup",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(),
                    response: {
                        accept: true,
                        items: [{ items: [{ accept: true }] }],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.decide.validation.requestItemAnsweredAsRequestItemGroup",
                    message: "The RequestItem was answered as a RequestItemGroup."
                }
            },
            {
                description: "(3) error: RequestItemGroup and ResponseItemGroup have different number of items",
                input: {
                    request: TestObjectFactory.createRequestWithOneItemGroup(),
                    response: {
                        accept: true,
                        items: [
                            {
                                items: [{ accept: true }, { accept: true }]
                            }
                        ],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.decide.validation.invalidNumberOfItems",
                    message: "The number of items in the RequestItemGroup and the ResponseItemGroup do not match."
                }
            },
            {
                description: "(4) error: item that must be accepted was rejected",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(undefined, true),
                    response: {
                        accept: true,
                        items: [{ accept: false }],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.decide.validation.mustBeAcceptedItemNotAccepted",
                    message: "The RequestItem is flagged as 'mustBeAccepted', but it was not accepted."
                }
            },
            {
                description: "(5) error: RequestItem contained within a RequestItemGroup that must be accepted was rejected",
                input: {
                    request: Request.from({
                        items: [
                            RequestItemGroup.from({
                                items: [TestRequestItem.from({ mustBeAccepted: true }), TestRequestItem.from({ mustBeAccepted: true })]
                            })
                        ]
                    }),
                    response: {
                        accept: true,
                        items: [
                            {
                                items: [{ accept: true }, { accept: false }]
                            }
                        ],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0, 1],
                    code: "error.consumption.requests.decide.validation.mustBeAcceptedItemNotAccepted",
                    message: "The RequestItem is flagged as 'mustBeAccepted', but it was not accepted."
                }
            },
            {
                description: "(6) error: when the Request is rejected no RequestItem may be accepted",
                input: {
                    request: TestObjectFactory.createRequestWithOneItem(),
                    response: {
                        accept: false,
                        items: [{ accept: true }],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.decide.validation.itemAcceptedButRequestNotAccepted",
                    message: "The RequestItem was accepted, but the Request was not accepted."
                }
            },
            {
                description: "(7) error: when the Request is rejected no RequestItem contained within a RequestItemGroup may be accepted",
                input: {
                    request: TestObjectFactory.createRequestWithOneItemGroup(),
                    response: {
                        accept: false,
                        items: [{ items: [{ accept: true }] }],
                        requestId
                    }
                },
                expectedError: {
                    indexPath: [0],
                    code: "error.consumption.requests.validation.inheritedFromItem",
                    message: "Some child items have errors."
                }
            }
        ];

        test.each([...successParams, ...errorParams])("$description", async function (data) {
            const localRequest = LocalRequest.from({
                id: CoreId.from(requestId),
                content: data.input.request,
                createdAt: CoreDate.utc(),
                isOwn: true,
                peer: CoreAddress.from("did:e:a-domain:dids:anidentity"),
                source: { reference: await CoreIdHelper.notPrefixed.generate(), type: "Message" },
                status: LocalRequestStatus.Open,
                statusLog: []
            });

            const validationResult = validator.validateItems(data.input.response, localRequest);

            if (!data.expectedError) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(
                    validationResult.isError(),
                    `expected success, but received the error '${
                        validationResult.isError() ? validationResult.error.code : ""
                    } - ${validationResult.isError() ? validationResult.error.message : ""}'`
                ).toBe(false);
                return;
            }

            expect(validationResult.isError(), "expected an error, but received success").toBe(true);
            if (!validationResult.isError()) throw new Error();

            const errorIndexPath = data.expectedError.indexPath;
            if (!errorIndexPath) {
                // no error path provided, so we expect the error to be at the root
                // eslint-disable-next-line jest/no-conditional-expect
                expect(validationResult.error.code).toStrictEqual(data.expectedError.code);
                // eslint-disable-next-line jest/no-conditional-expect
                expect(validationResult.error.message).toStrictEqual(data.expectedError.message);
                return;
            }

            expect(validationResult).errorValidationResult({
                code: "error.consumption.requests.validation.inheritedFromItem"
            });

            let childResult = validationResult;
            for (const index of errorIndexPath) childResult = childResult.items[index] as ErrorValidationResult;

            expect(childResult.isError(), "expected an error, but received success").toBe(true);
            if (!childResult.isError()) throw new Error();

            expect(childResult.error.code).toStrictEqual(data.expectedError.code);
            expect(childResult.error.message).toStrictEqual(data.expectedError.message);
        });
    });
});
