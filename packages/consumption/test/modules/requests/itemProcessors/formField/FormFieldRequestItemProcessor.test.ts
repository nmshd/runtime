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

    const aMaxRating = 5;

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
        const aMin = 1;
        const aMax = 10;
        const aUnit = "aUnit";

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
                    settings: StringFormFieldSettings.from({ allowNewLines: true })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("can create a string form field using min and max", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: StringFormFieldSettings.from({ min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
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
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({ unit: aUnit, min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
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
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aFormField",
                    settings: DoubleFormFieldSettings.from({ unit: aUnit, min: aMin, max: aMax })
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
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
        const aString = "aString";
        const anInteger = 123456789;
        const aDouble = 123456789.123456789;
        const aBoolean = true;
        const aDate = "2000-01-01T00:00:00.000Z";
        const aRating = 5;

        test("returns an error when it is tried to accept a free value form field with an array", function () {
            const requestItem = FormFieldRequestItem.from({
                mustBeAccepted: true,
                title: "aFormField",
                settings: StringFormFieldSettings.from({})
            });

            const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                accept: true,
                response: ["aString"]
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `Only a selection form field can be accepted with an array.`
            });
        });

        test("returns an error when it is tried to accept a selection form field with no array", function () {
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

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `A selection form field must be accepted with an array.`
            });
        });

        describe("StringFormFieldSettings", function () {
            test("can accept a string form field with a free string", function () {
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

            test("returns an error when it is tried to accept a string form field with no free string", function () {
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
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("IntegerFormFieldSettings", function () {
            test("can accept an integer form field with a free integer", function () {
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

            test("returns an error when it is tried to accept an integer form field with no free integer", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: IntegerFormFieldSettings.from({})
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDouble
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("DoubleFormFieldSettings", function () {
            test("can accept a double form field with a free double", function () {
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

            test("returns an error when it is tried to accept a double form field with no free double", function () {
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
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("BooleanFormFieldSettings", function () {
            test("can accept a boolean form field with a free boolean", function () {
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

            test("returns an error when it is tried to accept a boolean form field with no free boolean", function () {
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
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("DateFormFieldSettings", function () {
            test("can accept a date form field with a free date", function () {
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

            test("returns an error when it is tried to accept a date form field with no free date", function () {
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
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("RatingFormFieldSettings", function () {
            test("can accept a rating form field with a free rating", function () {
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

            test("returns an error when it is tried to accept a rating form field with no free rating", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: RatingFormFieldSettings.from({ maxRating: aMaxRating })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anInteger
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The response provided cannot be used to accept the form field.`
                });
            });
        });

        describe("SelectionFormFieldSettings", function () {
            test("can accept a selection form field with an option", function () {
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

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a selection form field with no option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: []
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `At least one option must be specified to accept a selection form field.`
                });
            });

            test("returns an error when it is tried to accept a selection form field with an unknown option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["unknownOption"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The selection form field does not provide the following option(s) for selection: 'unknownOption'.`
                });
            });

            test("can accept a selection form field allowing multiple selection with multiple options", function () {
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

            test("returns an error when it is tried to accept a selection form field allowing no multiple selection with more than one option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField",
                    settings: SelectionFormFieldSettings.from({ options: ["optionA", "optionB"] })
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A selection form field that does not allowMultipleSelection must be accepted with exactly one option.`
                });
            });
        });
    });

    describe("accept", function () {
        const aString = "aString";
        const anInteger = 123456789;
        const aDouble = 123456789.123456789;
        const aBoolean = true;
        const aDate = "2000-01-01T00:00:00.000Z";
        const aRating = 5;

        test("accept string form field with a free string", function () {
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

        test("accept integer form field with a free integer", function () {
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

        test("accept double form field with a free double", function () {
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

        test("accept boolean form field with a free boolean", function () {
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

        test("accept date form field with a free date", function () {
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

        test("accept rating form field with a free rating", function () {
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
                response: ["optionA"]
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
        test("does not create an Attribute when getting the free string entered by the recipient in the string form field", async function () {
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

        test("does not create an Attribute when getting the option selected by the recipient in the selection form field", async function () {
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
                response: ["optionA"]
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const attributesAfterGettingSelectedOption = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterGettingSelectedOption).toHaveLength(0);
        });
    });
});
