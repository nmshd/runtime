import { CoreDate } from "../src";

describe("CoreDate", function () {
    describe("Constructor", function () {
        test("returns the current date when constructor is empty", function () {
            const date = CoreDate.utc();
            expect(date).toBeDefined();
        });

        test("sets the date property as string", function () {
            const date = CoreDate.utc();
            expect(typeof date.date).toBe("string");
        });
    });

    describe("Add()", function () {
        test("returns a date in the future", function () {
            const date = CoreDate.utc().add({ years: 1 });
            expect(date).toBeDefined();
            expect(date.isAfter(CoreDate.utc())).toBe(true);
        });
    });

    describe("IsWithin()", function () {
        test("should return a correct value if it is within the given range (one parameter)", function () {
            const date = CoreDate.utc().subtract({ days: 1, seconds: 1 });
            expect(date.isWithin({ days: 5 })).toBe(true);
            expect(date.isWithin({ days: 1 })).toBe(false);
            expect(date.isWithin({ days: 1, minutes: 2 })).toBe(true);
            expect(date.isWithin({ days: -1 })).toBe(false);
        });

        test("should return a correct value if it is within the given range (two parameters)", function () {
            const date = CoreDate.utc().subtract({ days: 1, seconds: 1 });
            expect(date.isWithin({ days: 5 }, { days: 1 })).toBe(true);
            expect(date.isWithin({ days: 20 }, { days: -20 })).toBe(false);
            expect(date.isWithin({ days: 1, minutes: 2 }, { days: 1 })).toBe(true);
            expect(date.isWithin({ days: -1 }, { minutes: 4000 })).toBe(false);

            const date2 = CoreDate.utc().add({ days: 1, seconds: 1 });
            expect(date2.isWithin(0, { days: 2 })).toBe(true);
            expect(date2.isWithin({ days: 2 }, { days: 3 })).toBe(true);
            expect(date2.isWithin({ days: 1 }, { days: 3 })).toBe(true);
            expect(date2.isWithin({ days: -1 }, { seconds: 4000 })).toBe(false);
        });

        test("should return a correct value if it is within the given range (three parameters)", function () {
            const date = CoreDate.from("2020-01-01");
            const reference = CoreDate.from("2020-01-02");
            expect(date.isWithin({ days: 5 }, { days: 1 }, reference)).toBe(true);
            expect(date.isWithin({ days: 20 }, { days: -20 }, reference)).toBe(false);
            expect(date.isWithin({ days: 1, minutes: 2 }, { days: 1 }, reference)).toBe(true);
            expect(date.isWithin({ hours: 25 }, { hours: 25 }, reference)).toBe(true);
            expect(date.isWithin({ hours: 23 }, { hours: 25 }, reference)).toBe(false);

            const date2 = CoreDate.from("2020-01-03");
            expect(date2.isWithin(0, { days: 2 }, reference)).toBe(true);
            expect(date2.isWithin({ minutes: 2 }, { days: 1 }, reference)).toBe(false);
            expect(date2.isWithin({ days: 1 }, { days: 3 }, reference)).toBe(true);
            expect(date2.isWithin({ hours: 25 }, { hours: 25 }, reference)).toBe(true);
            expect(date2.isWithin({ hours: 23 }, { hours: 23 }, reference)).toBe(false);
        });
    });

    describe("From()", function () {
        test("returns a date when provided with a date", function () {
            const date = CoreDate.from(CoreDate.utc());
            expect(date).toBeDefined();
        });

        test("returns a date when provided with a string", function () {
            const date = CoreDate.from(CoreDate.utc().date);
            expect(date).toBeDefined();
        });
    });
});
