import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    BooleanFormFieldSettings,
    DateFormFieldSettings,
    DoubleFormFieldSettings,
    FormFieldAcceptResponseItem,
    FormFieldRequestItem,
    IntegerFormFieldSettings,
    RatingFormFieldSettings,
    Request,
    ResponseItemResult,
    SelectionFormFieldSettings,
    StringFormFieldSettings
} from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import {
    AcceptFormFieldRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    ErrorValidationResult,
    FormFieldRequestItemProcessor,
    LocalRequest,
    LocalRequestStatus
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("FormFieldRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;

    let processor: FormFieldRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        ({ consumptionController } = accounts[0]);

        processor = new FormFieldRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        describe("StringFormFieldSettings", function () {
            test("can create a string form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({})
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create a string form field allowing new lines", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ allowNewlines: true })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create a string form field using min and max", () => {
                const aMin = 1;
                const aMax = 10;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a string form field with a max smaller than the min", () => {
                const aMaxSmallerThanMin = 1;
                const aMinGreaterThanMax = 10;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ min: aMinGreaterThanMax, max: aMaxSmallerThanMin })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "The max cannot be smaller than the min."
                });
            });
        });

        describe("IntegerFormFieldSettings", function () {
            test("can create an integer form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({})
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create an integer form field using unit, min and max", () => {
                const aMin = 1;
                const aMax = 10;
                const aUnit = "aUnit";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({ unit: aUnit, min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create an integer form field with a max smaller than the min", () => {
                const aMaxSmallerThanMin = 1;
                const aMinGreaterThanMax = 10;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({ min: aMinGreaterThanMax, max: aMaxSmallerThanMin })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "The max cannot be smaller than the min."
                });
            });
        });

        describe("DoubleFormFieldSettings", function () {
            test("can create a double form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({})
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create a double form field using unit, min and max", () => {
                const aMin = 1;
                const aMax = 10;
                const aUnit = "aUnit";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({ unit: aUnit, min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a double form field with a max smaller than the min", () => {
                const aMaxSmallerThanMin = 1;
                const aMinGreaterThanMax = 10;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({ min: aMinGreaterThanMax, max: aMaxSmallerThanMin })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "The max cannot be smaller than the min."
                });
            });
        });

        describe("BooleanFormFieldSettings", function () {
            test("can create a boolean form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: BooleanFormFieldSettings.from({})
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });
        });

        describe("DateFormFieldSettings", function () {
            test("can create a date form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: DateFormFieldSettings.from({})
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });
        });

        describe("RatingFormFieldSettings", function () {
            test("can create a rating form field", () => {
                const aMaxRating = 5;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });
        });

        describe("SelectionFormFieldSettings", function () {
            test("can create a selection form field", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create a selection form field allowing multiple selection", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a selection form field with no options", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: [] })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A selection form field must provide at least one option."
                });
            });

            test("cannot create a selection form field with non-unique options", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionA"] })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A selection form field must provide unique options."
                });
            });
        });
    });

    describe("canAccept", function () {
        describe("StringFormFieldSettings", function () {
            test("can accept a string form field with a string", function () {
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aString
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a string form field with a string array", function () {
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: [aString]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "A string form field must be accepted with a string."
                });
            });

            test("returns an error when it is tried to accept a string form field with an integer", function () {
                const anInteger = 123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anInteger
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "A string form field must be accepted with a string."
                });
            });

            test("returns an error when it is tried to accept a string form field with a string whose length is smaller than the min", function () {
                const aMin = 1;
                const aStringTooShort = "";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ min: aMin })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aStringTooShort
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The length of the response cannot be smaller than the min ${aMin}.`
                });
            });

            test("returns an error when it is tried to accept a string form field with a string whose length is greater than the max", function () {
                const aMax = 10;
                const aStringTooLong = "aStringTooLong";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ max: aMax })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aStringTooLong
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The length of the response cannot be greater than the max ${aMax}.`
                });
            });
        });

        describe("IntegerFormFieldSettings", function () {
            test("can accept an integer form field with an integer", function () {
                const anInteger = 123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anInteger
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept an integer form field with a double which is no integer", function () {
                const aDoubleWhichIsNoInteger = 123456789.123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDoubleWhichIsNoInteger
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "An integer form field must be accepted with an integer."
                });
            });

            test("returns an error when it is tried to accept an integer form field with an integer which is smaller than the min", function () {
                const aMin = 1;
                const anIntegerTooSmall = -123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({ min: aMin })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anIntegerTooSmall
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response cannot be smaller than the min ${aMin}.`
                });
            });

            test("returns an error when it is tried to accept an integer form field with an integer which is greater than the max", function () {
                const aMax = 10;
                const anIntegerTooBig = 123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({ max: aMax })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anIntegerTooBig
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response cannot be greater than the max ${aMax}.`
                });
            });
        });

        describe("DoubleFormFieldSettings", function () {
            test("can accept a double form field with a double", function () {
                const aDouble = 123456789.123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDouble
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a double form field with a string", function () {
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aString
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "A double form field must be accepted with a double."
                });
            });

            test("returns an error when it is tried to accept a double form field with a double which is smaller than the min", function () {
                const aMin = 1;
                const aDoubleTooSmall = -123456789.123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({ min: aMin })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDoubleTooSmall
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response cannot be smaller than the min ${aMin}.`
                });
            });

            test("returns an error when it is tried to accept a double form field with a double which is greater than the max", function () {
                const aMax = 10;
                const aDoubleTooBig = 123456789.123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({ max: aMax })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDoubleTooBig
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response cannot be greater than the max ${aMax}.`
                });
            });
        });

        describe("BooleanFormFieldSettings", function () {
            test("can accept a boolean form field with a boolean", function () {
                const aBoolean = true;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: BooleanFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aBoolean
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a boolean form field with a string", function () {
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: BooleanFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aString
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "A boolean form field must be accepted with a boolean."
                });
            });
        });

        describe("DateFormFieldSettings", function () {
            test("can accept a date form field with a date", function () {
                const aDate = "2000-01-01T00:00:00.000Z";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DateFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDate
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a date form field with a string", function () {
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: DateFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aString
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: "A date form field must be accepted with a valid date string in ISO 8601 format."
                });
            });
        });

        describe("RatingFormFieldSettings", function () {
            test("can accept a rating form field with a rating", function () {
                const aMaxRating = 5;
                const aRating = 5;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aRating
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a rating form field with a string", function () {
                const aMaxRating = 5;
                const aString = "aString";

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aString
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The rating form field must be accepted with an integer between ${RatingFormFieldSettings.minRating} and ${aMaxRating}.`
                });
            });

            test("returns an error when it is tried to accept a rating form field with a rating which is smaller than the minimum rating", function () {
                const aMaxRating = 5;
                const aRatingTooSmall = 0;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aRatingTooSmall
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The rating form field must be accepted with an integer between ${RatingFormFieldSettings.minRating} and ${aMaxRating}.`
                });
            });

            test("returns an error when it is tried to accept a rating form field with a rating which is greater than the maxRating", function () {
                const aMaxRating = 5;
                const aRatingTooBig = 123456789;

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aRatingTooBig
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The rating form field must be accepted with an integer between ${RatingFormFieldSettings.minRating} and ${aMaxRating}.`
                });
            });
        });

        describe("SelectionFormFieldSettings", function () {
            describe("Single selection form field", function () {
                test("can accept a single selection form field with an option", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: "optionA"
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a single selection form field with an array", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: ["optionA"]
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: "A selection form field that does not allow multiple selection must be accepted with a string."
                    });
                });

                test("returns an error when it is tried to accept a single selection form field with an unknown option", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: "unknownOption"
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: "The selection form field does not provide the option 'unknownOption' for selection."
                    });
                });
            });

            describe("Multiple selection form field", function () {
                test("can accept a multiple selection form field with an option", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: ["optionA"]
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("can accept a multiple selection form field with multiple options", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: ["optionA", "optionB"]
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a multiple selection form field with a string", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: "optionA"
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: "A selection form field that allows multiple selection must be accepted with a string array."
                    });
                });

                test("returns an error when it is tried to accept a multiple selection form field with no option", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: []
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: "At least one option must be specified to accept a selection form field."
                    });
                });

                test("returns an error when it is tried to accept a multiple selection form field with an unknown option", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFormField",
                        settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: ["unknownOption"]
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters"
                    });
                    expect((result as ErrorValidationResult).error.message).toBe(
                        `The selection form field does not provide the following option(s) for selection: 'unknownOption'.`
                    );
                });
            });
        });
    });

    describe("accept", function () {
        test("accept string form field with a string", function () {
            const aString = "aString";

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: StringFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: aString
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept integer form field with an integer", function () {
            const anInteger = 123456789;

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: IntegerFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: anInteger
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept double form field with a double", function () {
            const aDouble = 123456789.123456789;

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: DoubleFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: aDouble
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept boolean form field with a boolean", function () {
            const aBoolean = true;

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: BooleanFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: aBoolean
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept date form field with a date", function () {
            const aDate = "2000-01-01T00:00:00.000Z";

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: DateFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: aDate
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept rating form field with a rating", function () {
            const aMaxRating = 5;
            const aRating = 5;

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: aRating
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept selection form field with an option", function () {
            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: "optionA"
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });

        test("accept selection form field with multiple options", function () {
            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"], allowMultipleSelection: true })
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: ["optionA", "optionB"]
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("does not create an Attribute when getting the string entered by the recipient in the string form field", async function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: StringFormFieldSettings.from({})
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

            const responseItem = FormFieldAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                response: "aFreeTextValue"
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const attributesAfterGettingFreeText = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterGettingFreeText).toHaveLength(0);
        });

        test("does not create an Attribute when getting the option selected by the recipient in the single selection form field", async function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
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

            const responseItem = FormFieldAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                response: "optionA"
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const attributesAfterGettingSelectedOption = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterGettingSelectedOption).toHaveLength(0);
        });
    });
});
