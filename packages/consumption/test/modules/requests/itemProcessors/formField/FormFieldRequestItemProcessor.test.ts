import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { FormFieldAcceptResponseItem, FormFieldRequestItem, FreeValueType, Request, ResponseItemResult } from "@nmshd/content";
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

    describe("Common form field validation", function () {
        test("cannot specify no freeValueFormField and no selectionFormField", () => {
            expect(() => {
                FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFormField"
                });
            }).toThrow(`You have to specify either freeValueFormField or selectionFormField.`);
        });

        test("cannot specify both a freeValueFormField and a selectionFormField", () => {
            expect(() => {
                FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormFieldOrASelectionFormField",
                    freeValueFormField: { freeValueType: FreeValueType.String },
                    selectionFormField: { options: ["optionA", "optionB"] }
                });
            }).toThrow(`You cannot specify both freeValueFormField and selectionFormField.`);
        });
    });

    describe("Validate freeValueFormField", function () {
        const aMin = 1;
        const aMax = 10;
        const aUnit = "aUnit";

        const aString = "aString";
        const anInteger = 123456789;
        const aDouble = 123456789.123456789;
        const aBoolean = true;
        const aDate = new Date("2000-01-01");

        describe("canCreateOutgoingRequestItem", function () {
            describe("String freeValueFormField", function () {
                test("can create a string freeValueFormField", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("can create a string freeValueFormField allowing new lines", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String, allowNewLines: true }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("cannot create a string freeValueFormField using unit", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String, unit: aUnit }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with unit must be of freeValueType 'Integer' or 'Double'.`
                    });
                });

                test("can create a string freeValueFormField using min and max", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String, min: aMin, max: aMax }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });
            });

            describe("Integer freeValueFormField", function () {
                test("can create an integer freeValueFormField", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Integer }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("cannot create an integer freeValueFormField allowing new lines", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Integer, allowNewLines: true }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with allowNewLines must be of freeValueType 'String'.`
                    });
                });

                test("can create an integer freeValueFormField using unit, min and max", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Integer, unit: aUnit, min: aMin, max: aMax }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });
            });

            describe("Double freeValueFormField", function () {
                test("can create a double freeValueFormField", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Double }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("cannot create a double freeValueFormField allowing new lines", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Double, allowNewLines: true }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with allowNewLines must be of freeValueType 'String'.`
                    });
                });

                test("can create a double freeValueFormField using unit, min and max", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Double, unit: aUnit, min: aMin, max: aMax }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });
            });

            describe("Boolean freeValueFormField", function () {
                test("can create a boolean freeValueFormField", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("cannot create a boolean freeValueFormField allowing new lines", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean, allowNewLines: true }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with allowNewLines must be of freeValueType 'String'.`
                    });
                });

                test("cannot create a boolean freeValueFormField using unit", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean, unit: aUnit }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with unit must be of freeValueType 'Integer' or 'Double'.`
                    });
                });

                test("cannot create a boolean freeValueFormField using min", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean, min: aMin }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with min must be of freeValueType 'String', 'Integer' or 'Double'.`
                    });
                });

                test("cannot create a boolean freeValueFormField using max", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean, max: aMax }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with max must be of freeValueType 'String', 'Integer' or 'Double'.`
                    });
                });
            });

            describe("Date freeValueFormField", function () {
                test("can create a date freeValueFormField", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).successfulValidationResult();
                });

                test("cannot create a date freeValueFormField allowing new lines", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date, allowNewLines: true }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with allowNewLines must be of freeValueType 'String'.`
                    });
                });

                test("cannot create a date freeValueFormField using unit", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date, unit: aUnit }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with unit must be of freeValueType 'Integer' or 'Double'.`
                    });
                });

                test("cannot create a date freeValueFormField using min", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date, min: aMin }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with min must be of freeValueType 'String', 'Integer' or 'Double'.`
                    });
                });

                test("cannot create a date freeValueFormField using max", () => {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: false,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date, max: aMax }
                    });

                    const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: `A freeValueFormField with max must be of freeValueType 'String', 'Integer' or 'Double'.`
                    });
                });
            });
        });

        describe("canAccept", function () {
            test("returns an error when it is tried to accept a freeValueFormField with an array", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.String }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["aString"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A freeValueFormField cannot be accepted with an array.`
                });
            });

            describe("String freeValueFormField", function () {
                test("can accept a string freeValueFormField with a free string", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aString
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a string freeValueFormField with no free string", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.String }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: anInteger
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: `Conversion of the provided freeValue to the freeValueType 'String' of the freeValueFormField is not possible.`
                    });
                });
            });

            describe("Integer freeValueFormField", function () {
                test("can accept an integer freeValueFormField with a free integer", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Integer }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: anInteger
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept an integer freeValueFormField with no free integer", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Integer }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aDouble
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: `Conversion of the provided freeValue to the freeValueType 'Integer' of the freeValueFormField is not possible.`
                    });
                });
            });

            describe("Double freeValueFormField", function () {
                test("can accept a double freeValueFormField with a free double", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Double }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aDouble
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a double freeValueFormField with no free double", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Double }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aString
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: `Conversion of the provided freeValue to the freeValueType 'Double' of the freeValueFormField is not possible.`
                    });
                });
            });

            describe("Boolean freeValueFormField", function () {
                test("can accept a boolean freeValueFormField with a free boolean", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aBoolean
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a boolean freeValueFormField with no free boolean", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Boolean }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aString
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: `Conversion of the provided freeValue to the freeValueType 'Boolean' of the freeValueFormField is not possible.`
                    });
                });
            });

            describe("Date freeValueFormField", function () {
                test("can accept a date freeValueFormField with a free date", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aDate.toString()
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).successfulValidationResult();
                });

                test("returns an error when it is tried to accept a date freeValueFormField with no free date", function () {
                    const requestItem = FormFieldRequestItem.from({
                        mustBeAccepted: true,
                        title: "aFreeValueFormField",
                        freeValueFormField: { freeValueType: FreeValueType.Date }
                    });

                    const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                        accept: true,
                        response: aString
                    };

                    const result = processor.canAccept(requestItem, acceptParams);

                    expect(result).errorValidationResult({
                        code: "error.consumption.requests.invalidAcceptParameters",
                        message: `Conversion of the provided freeValue to the freeValueType 'Date' of the freeValueFormField is not possible.`
                    });
                });
            });
        });

        describe("accept", function () {
            const anInteger = 123456789;

            test("accept string freeValueFormField with a free string", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.String }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: "aFreeTextValue"
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });

            test("accept integer freeValueFormField with a free integer", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.Integer }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: anInteger
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });

            test("accept double freeValueFormField with a free double", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.Double }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDouble
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });

            test("accept boolean freeValueFormField with a free boolean", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.Boolean }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aBoolean
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });

            test("accept date freeValueFormField with a free date", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.Date }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: aDate.toString()
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });
        });

        describe("applyIncomingResponseItem", function () {
            test("does not create an Attribute when getting the free string entered by the recipient in the string freeValueFormField", async function () {
                const recipient = CoreAddress.from("Recipient");

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aFreeValueFormField",
                    freeValueFormField: { freeValueType: FreeValueType.String }
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
        });
    });

    describe("Validate selectionFormField", function () {
        describe("canCreateOutgoingRequestItem", function () {
            test("can create a selectionFormField", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a selectionFormField with no options", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aSelectionFormField",
                    selectionFormField: { options: [] }
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A selectionFormField must provide at least one option."
                });
            });

            test("cannot create a selectionFormField with non-unique options", () => {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: false,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionA"] }
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A selectionFormField must provide unique options."
                });
            });
        });

        describe("canAccept", function () {
            test("returns an error when it is tried to accept a selectionFormField with no array", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: "optionA"
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A selectionFormField must be accepted with an array.`
                });
            });

            test("can accept a selectionFormField with an option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["optionA"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a selectionFormField with no option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: []
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `At least one option must be specified to accept a selectionFormField.`
                });
            });

            test("returns an error when it is tried to accept a selectionFormField with an unknown option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["unknownOption"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The selectionFormField does not provide the following option(s) for selection: 'unknownOption'.`
                });
            });

            test("can accept a selectionFormField allowing multiple selection with multiple options", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"], allowMultipleSelection: true }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a selectionFormField allowing no multiple selection with more than one option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A selectionFormField that does not allowMultipleSelection must be accepted with exactly one option.`
                });
            });
        });

        describe("accept", function () {
            test("accept selectionFormField with an option", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
                });

                const acceptParams: AcceptFormFieldRequestItemParametersJSON = {
                    accept: true,
                    response: ["optionA"]
                };

                const result = processor.accept(requestItem, acceptParams);
                expect(result).toBeInstanceOf(FormFieldAcceptResponseItem);
            });

            test("accept selectionFormField with multiple options", function () {
                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"], allowMultipleSelection: true }
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
            test("does not create an Attribute when getting the option selected by the recipient in the selectionFormField", async function () {
                const recipient = CoreAddress.from("Recipient");

                const requestItem = FormFieldRequestItem.from({
                    mustBeAccepted: true,
                    title: "aSelectionFormField",
                    selectionFormField: { options: ["optionA", "optionB"] }
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
});
