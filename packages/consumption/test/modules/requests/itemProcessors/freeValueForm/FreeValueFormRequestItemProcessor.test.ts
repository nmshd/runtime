import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { FreeValueFormAcceptResponseItem, FreeValueFormFieldTypes, FreeValueFormRequestItem, Request, ResponseItemResult } from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { Transport } from "@nmshd/transport";
import {
    AcceptFreeValueFormRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    FreeValueFormRequestItemProcessor,
    LocalRequest,
    LocalRequestStatus
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("FreeValueFormRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;

    let processor: FreeValueFormRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 1);
        ({ consumptionController } = accounts[0]);

        processor = new FreeValueFormRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        test("can create a form text field", async () => {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: false,
                freeValueType: FreeValueFormFieldTypes.TextField
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

            expect(result).successfulValidationResult();
        });

        test("can create a form number field", async () => {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: false,
                freeValueType: FreeValueFormFieldTypes.NumberField
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

            expect(result).successfulValidationResult();
        });

        test("can create a form date field", async () => {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: false,
                freeValueType: FreeValueFormFieldTypes.DateField
            });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, Request.from({ items: [requestItem] }));

            expect(result).successfulValidationResult();
        });
    });

    describe("canAccept", function () {
        test("can accept a form text field with a free text", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.TextField
            });

            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: "aFreeTextValue"
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).successfulValidationResult();
        });

        test("can accept a form number field with a free number", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.NumberField
            });

            const aNumber = 123456789;
            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: aNumber.toString()
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).successfulValidationResult();
        });

        test("returns an error when it is tried to accept a form number field with no free number", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.NumberField
            });

            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: "noNumber"
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `Conversion of the provided freeValue 'noNumber' to the freeValueType 'NumberField' of the FreeValueFormRequestItem is not possible.`
            });
        });

        test("can accept a form date field with a free date", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.DateField
            });

            const aDate = new Date("2000-01-01");
            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: aDate.toString()
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).successfulValidationResult();
        });

        test("returns an error when it is tried to accept a form date field with no free date", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.DateField
            });

            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: "noDate"
            };

            const result = processor.canAccept(requestItem, acceptParams);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters",
                message: `Conversion of the provided freeValue 'noDate' to the freeValueType 'DateField' of the FreeValueFormRequestItem is not possible.`
            });
        });
    });

    describe("accept", function () {
        test("accept form text field with a free text", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.TextField
            });

            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: "aFreeTextValue"
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FreeValueFormAcceptResponseItem);
        });

        test("accept form number field with a free number", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.NumberField
            });

            const aNumber = 123456789;
            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: aNumber.toString()
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FreeValueFormAcceptResponseItem);
        });

        test("accept form date field with a free date", function () {
            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.DateField
            });

            const aDate = new Date("2000-01-01");
            const acceptParams: AcceptFreeValueFormRequestItemParametersJSON = {
                accept: true,
                freeValue: aDate.toString()
            };

            const result = processor.accept(requestItem, acceptParams);
            expect(result).toBeInstanceOf(FreeValueFormAcceptResponseItem);
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("does not create an Attribute when getting the free text entered by the recipient in the form text field", async function () {
            const recipient = CoreAddress.from("Recipient");

            const requestItem = FreeValueFormRequestItem.from({
                mustBeAccepted: true,
                freeValueType: FreeValueFormFieldTypes.TextField
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

            const responseItem = FreeValueFormAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                freeValue: "aFreeTextValue"
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest);

            const attributesAfterGettingFreeText = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterGettingFreeText).toHaveLength(0);
        });
    });
});
