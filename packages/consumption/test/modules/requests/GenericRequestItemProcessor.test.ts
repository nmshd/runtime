import { ConsumptionController, GenericRequestItemProcessor } from "@nmshd/consumption";
import { AcceptResponseItem, RejectResponseItem, ResponseItemResult } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, IdentityController } from "@nmshd/transport";
import { TestRequestItem } from "./testHelpers/TestRequestItem.js";

describe("RequestItemProcessor", function () {
    /* ****** Incoming RequestItems ******* */
    describe("CheckPrerequisitesOfIncomingRequestItem", function () {
        test("returns true", async function () {
            const processor = createProcessor();
            const requestItem = new TestRequestItem();

            const actual = await processor.checkPrerequisitesOfIncomingRequestItem(requestItem, undefined!);

            expect(actual).toBe(true);
        });
    });

    describe("CanAccept", function () {
        test("returns 'success'", async function () {
            const processor = createProcessor();

            const localRequest = undefined!; // pass undefined as request since it isn't used anyway

            const result = await processor.canAccept(
                TestRequestItem.from({ mustBeAccepted: false }),
                {
                    accept: true
                },
                localRequest
            );

            expect(result).successfulValidationResult();
        });
    });

    describe("CanReject", function () {
        test("returns 'success'", async function () {
            const processor = createProcessor();

            const localRequest = undefined!; // pass undefined as request since it isn't used anyway

            const result = await processor.canReject(
                TestRequestItem.from({ mustBeAccepted: false }),
                {
                    accept: false
                },
                localRequest
            );

            expect(result).successfulValidationResult();
        });
    });

    describe("Accept", function () {
        test("returns an AcceptResponseItem", function () {
            const processor = createProcessor();

            const localRequest = undefined!; // pass undefined as request since it isn't used anyway

            const result = processor.accept(
                TestRequestItem.from({ mustBeAccepted: false }),
                {
                    accept: true
                },
                localRequest
            );

            expect(result).toBeInstanceOf(AcceptResponseItem);
        });
    });

    describe("Reject", function () {
        test("returns a RejectResponseItem", function () {
            const processor = createProcessor();

            const localRequest = undefined!; // pass undefined as request since it isn't used anyway

            const result = processor.reject(
                TestRequestItem.from({ mustBeAccepted: false }),
                {
                    accept: false,
                    code: "an.error.code",
                    message: "An error message"
                },
                localRequest
            );

            expect(result).toBeInstanceOf(RejectResponseItem);
            expect((result as RejectResponseItem).code).toBe("an.error.code");
            expect((result as RejectResponseItem).message).toBe("An error message");
        });
    });

    /* ****** Outgoing RequestItems ******* */
    describe("CanCreateOutgoingRequestItem", function () {
        test("returns true", async function () {
            const processor = createProcessor();

            const actual = await processor.canCreateOutgoingRequestItem(TestRequestItem.from({ mustBeAccepted: false }), undefined!, undefined);

            expect(actual.isSuccess()).toBe(true);
        });
    });

    describe("CanApplyIncomingResponseItem", function () {
        test("returns 'success'", async function () {
            const processor = createProcessor();

            const localRequest = undefined!; // pass undefined as request since it isn't used anyway

            const actual = await processor.canApplyIncomingResponseItem(
                AcceptResponseItem.from({ result: ResponseItemResult.Accepted }),
                TestRequestItem.from({ mustBeAccepted: false }),
                localRequest
            );

            expect(actual.isSuccess()).toBe(true);
        });
    });
});

function createProcessor() {
    const fakeConsumptionController = {
        accountController: {
            identity: { address: CoreAddress.from("anAddress") } as IdentityController
        } as AccountController
    } as ConsumptionController;

    return new GenericRequestItemProcessor(fakeConsumptionController);
}
