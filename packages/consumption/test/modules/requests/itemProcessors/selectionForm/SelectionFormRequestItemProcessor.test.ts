import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Request, ResponseItemResult, SelectionFormAcceptResponseItem, SelectionFormFieldTypes, SelectionFormRequestItem } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import {
    AcceptSelectionFormRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalRequest,
    LocalRequestStatus,
    SelectionFormRequestItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("SelectionFormRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;

    let processor: SelectionFormRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        ({ consumptionController } = accounts[0]);

        processor = new SelectionFormRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        describe("RadioButtonGroups", function () {
            test("can create a form radio button group", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionB"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a form radio button group with no options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: []
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide at least one option."
                });
            });

            test("cannot create a form radio button group with non-unique options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionA"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide unique options."
                });
            });
        });

        describe("DropdownMenus", function () {
            test("can create a form dropdown menu", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionB"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a form dropdown menu with no options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: []
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide at least one option."
                });
            });

            test("cannot create a form dropdown menu with non-unique options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionA"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide unique options."
                });
            });
        });

        describe("Checklists", function () {
            test("can create a form checklist", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).successfulValidationResult();
            });

            test("cannot create a form checklist with no options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: []
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide at least one option."
                });
            });

            test("cannot create a form checklist with non-unique options", () => {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: false,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionA"]
                });

                const result = processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "A SelectionFormRequestItem must provide unique options."
                });
            });
        });
    });

    describe("canAccept", function () {
        describe("RadioButtonGroups", function () {
            test("can accept a form radio button group with an option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a form radio button group with no option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: []
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `At least one option must be specified to accept a SelectionFormRequestItem.`
                });
            });

            test("returns an error when it is tried to accept a form radio button group with an unknown option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["unknownOption"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The SelectionRequestItem does not provide the option 'unknownOption' for selection.`
                });
            });

            test("returns an error when it is tried to accept a form radio button group with more than one option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A SelectionFormRequestItem of the 'RadioButtonGroup' selectionType must be accepted with exactly one option.`
                });
            });
        });

        describe("DropdownMenus", function () {
            test("can accept a form dropdown menu with an option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a form dropdown menu with no option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: []
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `At least one option must be specified to accept a SelectionFormRequestItem.`
                });
            });

            test("returns an error when it is tried to accept a form dropdown menu with an unknown option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["unknownOption"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The SelectionRequestItem does not provide the option 'unknownOption' for selection.`
                });
            });

            test("returns an error when it is tried to accept a form dropdown menu with more than one option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.DropdownMenu,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `A SelectionFormRequestItem of the 'DropdownMenu' selectionType must be accepted with exactly one option.`
                });
            });
        });

        describe("Checklists", function () {
            test("can accept a form checklist with an option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("can accept a form checklist with multiple options", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA", "optionB"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).successfulValidationResult();
            });

            test("returns an error when it is tried to accept a form checklist with no option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: []
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `At least one option must be specified to accept a SelectionFormRequestItem.`
                });
            });

            test("returns an error when it is tried to accept a form checklist with an unknown option", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["unknownOption"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The SelectionRequestItem does not provide the option 'unknownOption' for selection.`
                });
            });

            test("returns an error when it is tried to accept a form checklist with the same option twice", function () {
                const requestItem = SelectionFormRequestItem.from({
                    mustBeAccepted: true,
                    selectionType: SelectionFormFieldTypes.Checklist,
                    options: ["optionA", "optionB"]
                });

                const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                    accept: true,
                    options: ["optionA", "optionA"]
                };

                const result = processor.canAccept(requestItem, acceptParams);

                expect(result).errorValidationResult({
                    code: "error.consumption.requests.invalidAcceptParameters",
                    message: `The options specified for accepting a SelectionFormRequestItem must be unique.`
                });
            });
        });
    });

    describe("accept", function () {
        test("accept form radio button group with an option", function () {
            const requestItem = SelectionFormRequestItem.from({
                mustBeAccepted: true,
                selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                options: ["optionA", "optionB"]
            });

            const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                accept: true,
                options: ["optionA"]
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(SelectionFormAcceptResponseItem);
        });

        test("accept form dropdown menu with an option", function () {
            const requestItem = SelectionFormRequestItem.from({
                mustBeAccepted: true,
                selectionType: SelectionFormFieldTypes.DropdownMenu,
                options: ["optionA", "optionB"]
            });

            const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                accept: true,
                options: ["optionA"]
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(SelectionFormAcceptResponseItem);
        });

        test("accept form checklist with an option", function () {
            const requestItem = SelectionFormRequestItem.from({
                mustBeAccepted: true,
                selectionType: SelectionFormFieldTypes.Checklist,
                options: ["optionA", "optionB"]
            });

            const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                accept: true,
                options: ["optionA"]
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(SelectionFormAcceptResponseItem);
        });

        test("accept form checklist with multiple options", function () {
            const requestItem = SelectionFormRequestItem.from({
                mustBeAccepted: true,
                selectionType: SelectionFormFieldTypes.Checklist,
                options: ["optionA", "optionB"]
            });

            const acceptParams: AcceptSelectionFormRequestItemParametersJSON = {
                accept: true,
                options: ["optionA", "optionB"]
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(SelectionFormAcceptResponseItem);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("does not create an Attribute when getting the option selected by the recipient in the form radio button group", async function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = SelectionFormRequestItem.from({
                mustBeAccepted: true,
                selectionType: SelectionFormFieldTypes.RadioButtonGroup,
                options: ["optionA", "optionB"]
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

            const responseItem = SelectionFormAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                options: ["optionA"]
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const attributesAfterGettingSelectedOption = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterGettingSelectedOption).toHaveLength(0);
        });
    });
});
