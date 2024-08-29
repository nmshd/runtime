import { CoreError } from "../src";

describe("CoreError", function () {
    describe("From()", function () {
        test("returns an error when provided with an ICoreError", function () {
            const error = new CoreError();
            expect(error.code).toBe("error.unknown");
            expect(error.reason).toBe("Operation failed unexpectedly.");
        });

        test("returns an error when provided with a code and reason", function () {
            const error = new CoreError("error.code", "error.reason");
            expect(error.code).toBe("error.code");
            expect(error.reason).toBe("error.reason");
        });

        test("returns an error when provided with all properties filled", function () {
            const context = () => {
                // noop
            };
            const error = new CoreError("error.code", "error.reason", "error.data", new Date(0), new Error("error.rootError"), context);
            expect(error.code).toBe("error.code");
            expect(error.reason).toBe("error.reason");
            expect(error.data).toBe("error.data");
            expect(error.time.toISOString()).toBe(new Date(0).toISOString());
            expect(error.rootError).toStrictEqual(new Error("error.rootError"));
            expect(error.context).toBe(context);
        });
    });

    describe("Equals()", function () {
        test("should return true if the errors are equal", function () {
            const error = new CoreError("error.code", "error.reason");
            const error2 = new CoreError("error.code", "error.reason");
            expect(error.equals(error2)).toBe(true);
        });

        test("should return false if the codes are not equal", function () {
            const error = new CoreError("error.code", "error.reason");
            const error2 = new CoreError("error.code2", "error.reason");
            expect(error.equals(error2)).toBe(false);
        });

        test("should return true if the reasons are not equal but the code matches", function () {
            const error = new CoreError("error.code", "error.reason");
            const error2 = new CoreError("error.code", "error.reason2");
            expect(error.equals(error2)).toBe(true);
        });

        test("should return true if the error is the same CoreError", function () {
            const error = new CoreError("error.code", "error.reason");
            const error2 = error;
            expect(error.equals(error2)).toBe(true);
        });
    });

    describe("LogWith()", function () {
        test("should return the error", function () {
            const error = new CoreError("error.code", "error.reason");

            const logger = {
                fatal: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn(),
                debug: jest.fn(),
                trace: jest.fn()
            };

            expect(error.logWith(logger)).toStrictEqual(error);

            expect(logger.error).toHaveBeenCalledTimes(1);
        });
    });
});
