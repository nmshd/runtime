import { Request, RequestItemGroup } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport";
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

beforeEach(function () {
    validator = new DecideRequestParametersValidator();
});

describe("DecideRequestParametersValidator", function () {
    const requestId = "requestId";

    const successParams: TestParam[] = [
        {
            description: "(1) success: accept Request with one RequestItem and accept the item",
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
            description: "(2) success: accept Request with RequestItemGroup and accept the item",
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
            description: "(3) success: accept Request with one RequestItem and reject the item",
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
            description: "(4) success: accept Request with RequestItemGroup and reject the item",
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
            description: "(5) success: group must not be accepted, item must be accepted; reject item",
            input: {
                request: Request.from({
                    items: [
                        RequestItemGroup.from({
                            mustBeAccepted: false,
                            items: [TestRequestItem.from({ mustBeAccepted: true })]
                        })
                    ]
                }),
                response: {
                    accept: true,
                    items: [
                        {
                            items: [{ accept: false }]
                        }
                    ],
                    requestId
                }
            }
        },
        {
            description: "(6) success: accept a Request without accepting any item (no items mustBeAccepted)",
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
            description: "(7) success: items that must not be accepted in a group are rejected",
            input: {
                request: Request.from({
                    items: [
                        RequestItemGroup.from({
                            items: [TestRequestItem.from({ mustBeAccepted: false }), TestRequestItem.from({ mustBeAccepted: true })],
                            mustBeAccepted: false
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
            description: "(1) error: Request with two items is answered with one item",
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
                message: "Number of items in Request and Response do not match"
            }
        },
        {
            description: "(2) error: Request with one item is answered with two items",
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
                message: "Number of items in Request and Response do not match"
            }
        },
        {
            description: "(3) error: Request with one RequestItemGroup is answered as a RequestItem",
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
            description: "(4) error: Request with one RequestItem is answered as a RequestItemGroup",
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
            description: "(5) error: RequestItemGroup and ResponseItemGroup have different number of items",
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
                message: "Number of items in RequestItemGroup and ResponseItemGroup do not match"
            }
        },
        {
            description: "(6) error: item that must be accepted was rejected",
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
            description: "(7) error: item in a RequestItemGroup that must be accepted was rejected",
            input: {
                request: TestObjectFactory.createRequestWithOneItemGroup(undefined, true),
                response: {
                    accept: true,
                    items: [{ items: [{ accept: false }] }],
                    requestId
                }
            },
            expectedError: {
                indexPath: [0],
                code: "error.consumption.requests.decide.validation.mustBeAcceptedItemNotAccepted",
                message: "The RequestItemGroup is flagged as 'mustBeAccepted', but it was not accepted. Please accept all 'mustBeAccepted' items in this group."
            }
        },
        {
            description: "(8) error: when the Request is rejected no RequestItem may be accepted",
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
                code: "error.consumption.requests.decide.validation.itemAcceptedButParentNotAccepted",
                message: "The RequestItem was accepted, but the parent was not accepted."
            }
        },
        {
            description: "(9) error: when the Request is rejected no RequestItemGroup may be accepted",
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
                code: "error.consumption.requests.decide.validation.itemAcceptedButParentNotAccepted",
                message: "The RequestItemGroup was accepted, but the parent was not accepted."
            }
        },
        {
            description: "(10) error: accepting a group but not accepting all 'mustBeAccepted' items in the group",
            input: {
                request: Request.from({
                    items: [
                        RequestItemGroup.from({
                            items: [TestRequestItem.from({ mustBeAccepted: true }), TestRequestItem.from({ mustBeAccepted: true })],
                            mustBeAccepted: false
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
        }
    ];

    test.each([...successParams, ...errorParams])("${value.description}", async function (data) {
        const localRequest = LocalRequest.from({
            id: CoreId.from(requestId),
            content: data.input.request,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: CoreAddress.from("id1"),
            source: { reference: await CoreId.generate(), type: "Message" },
            status: LocalRequestStatus.Open,
            statusLog: []
        });

        const validationResult = validator.validate(data.input.response, localRequest);

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

        expect(validationResult.error.code).toBe("inheritedFromItem");
        expect(validationResult.error.message).toBe("Some child items have errors.");

        let childResult = validationResult;
        for (const index of errorIndexPath) childResult = childResult.items[index] as ErrorValidationResult;

        expect(childResult.isError(), "expected an error, but received success").toBe(true);
        if (!childResult.isError()) throw new Error();

        expect(childResult.error.code).toStrictEqual(data.expectedError.code);
        expect(childResult.error.message).toStrictEqual(data.expectedError.message);
    });
});
