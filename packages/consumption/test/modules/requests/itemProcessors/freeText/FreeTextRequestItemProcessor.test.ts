import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { FreeTextRequestItem } from "@nmshd/content";
import { Transport } from "@nmshd/transport";
import { ConsumptionController, FreeTextRequestItemProcessor } from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";

describe("FreeTextRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;

    let processor: FreeTextRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        consumptionController = account.consumptionController;

        processor = new FreeTextRequestItemProcessor(consumptionController);
    });

    afterAll(async function () {
        await connection.close();
    });

    afterEach(async function () {
        const listeners = await consumptionController.attributeListeners.getAttributeListeners();

        for (const listener of listeners) {
            await consumptionController.attributeListeners["attributeListeners"].delete(listener);
        }
    });

    describe("canAccept", function () {
        test("returns success when called with valid params", function () {
            const requestItem = FreeTextRequestItem.from({
                mustBeAccepted: true,
                freeText: "This is a TestRequest"
            });

            const result = processor.canAccept(requestItem, {
                accept: true,
                freeText: "This is a TestResponse"
            });

            expect(result).successfulValidationResult();
        });

        test("returns an error when called with invalid params", function () {
            const requestItem = FreeTextRequestItem.from({
                mustBeAccepted: true,
                freeText: "This is a TestRequest"
            });

            const result = processor.canAccept(requestItem, {
                accept: true,
                freeText: {} as string
            });

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidAcceptParameters"
            });
        });
    });

    describe("accept", function () {
        test("creates a FreeTextAcceptResponseItem when called with valid params", function () {
            const requestItem = FreeTextRequestItem.from({
                mustBeAccepted: true,
                freeText: "This is a TestRequest"
            });

            const result = processor.accept(requestItem, {
                accept: true,
                freeText: "This is a TestResponse"
            });

            expect(result.freeText).toBe("This is a TestResponse");
        });
    });
});
