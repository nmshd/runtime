import { DateTime } from "luxon";
import { BirthDate, ValidationErrorWithoutProperty } from "../../src";

describe("creation of IdentityAttributes with value type BirthDate", () => {
    test("can create an IdentityAttribute with value type BirthDate", function () {
        const validBirthDate = BirthDate.from({ day: 1, month: 12, year: 1990 });
        expect(validBirthDate.constructor.name).toBe("BirthDate");
        expect(validBirthDate.day.value).toBe(1);
        expect(validBirthDate.month.value).toBe(12);
        expect(validBirthDate.year.value).toBe(1990);
    });

    test("returns an error when trying to create an invalid BirthDate with violated validation criteria of a single property", function () {
        const invalidBirthDateCall = () => {
            BirthDate.from({ day: 1, month: 13, year: 1990 });
        };
        expect(invalidBirthDateCall).toThrow("BirthMonth.value:Number :: must be an integer value between 1 and 12");
    });

    test("returns an error when trying to create an invalid BirthDate with cross-component violated validation criteria for June", function () {
        const invalidBirthDateCall = () => {
            BirthDate.from({ day: 31, month: 6, year: 1990 });
        };
        expect(invalidBirthDateCall).toThrow(new ValidationErrorWithoutProperty(BirthDate.name, "The BirthDate is not a valid date."));
    });

    test("returns an error when trying to create an invalid BirthDate with cross-component violated validation criteria for February", function () {
        const invalidBirthDateCall = () => {
            BirthDate.from({ day: 29, month: 2, year: 2010 });
        };
        expect(invalidBirthDateCall).toThrow(new ValidationErrorWithoutProperty(BirthDate.name, "The BirthDate is not a valid date."));
    });

    test("returns an error when trying to create an BirthDate that is in the future", function () {
        const currentDateTime = DateTime.utc();
        const yearInFuture = currentDateTime.year + 1;

        const invalidBirthDateCall = () => {
            BirthDate.from({ day: 10, month: 6, year: yearInFuture });
        };
        expect(invalidBirthDateCall).toThrow(new ValidationErrorWithoutProperty(BirthDate.name, "You cannot enter a BirthDate that is in the future."));
    });
});
