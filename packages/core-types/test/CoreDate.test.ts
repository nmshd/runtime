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

    describe("Subtract()", function () {
        test("returns a date in the past", function () {
            const date = CoreDate.utc().subtract({ years: 1 });
            expect(date).toBeDefined();
            expect(date.isBefore(CoreDate.utc())).toBe(true);
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

        test("returns a date when provided with a number", function () {
            const date = CoreDate.from(CoreDate.utc().dateTime.toMillis());
            expect(date).toBeDefined();
        });

        test("returns a date when provided with a Date", function () {
            const date = CoreDate.from({ date: "2024" });
            expect(date).toBeDefined();
        });
    });

    describe("Format()", function () {
        test("returns a formatted date", function () {
            const date = CoreDate.from("2024");
            expect(date.format("yyyy")).toBe("2024");
        });
    });

    describe("IsBefore()", function () {
        test("returns true if the date is before the other date", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isBefore(date2)).toBe(false);
            expect(date2.isBefore(date)).toBe(true);
        });

        test("returns true if the date is before the other date with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isBefore(date2, "day")).toBe(false);
            expect(date2.isBefore(date, "day")).toBe(true);
        });
    });

    describe("IsAfter()", function () {
        test("returns true if the date is after the other date", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isAfter(date2)).toBe(true);
            expect(date2.isAfter(date)).toBe(false);
        });

        test("returns true if the date is after the other date with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isAfter(date2, "day")).toBe(true);
            expect(date2.isAfter(date, "day")).toBe(false);
        });
    });

    describe("IsSame()", function () {
        test("returns true if the date is the same as the other date", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSame(date2)).toBe(false);
            expect(date.isSame(date)).toBe(true);
        });

        test("returns true if the date is the same as the other date with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSame(date2, "day")).toBe(false);
            expect(date.isSame(date, "day")).toBe(true);
        });
    });

    describe("IsSameOrAfter()", function () {
        test("returns true if the date is the same or after the other date", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSameOrAfter(date2)).toBe(true);
            expect(date2.isSameOrAfter(date)).toBe(false);
        });

        test("returns true if the date is the same or after the other date with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSameOrAfter(date2, "day")).toBe(true);
            expect(date2.isSameOrAfter(date, "day")).toBe(false);
        });
    });

    describe("IsSameOrBefore()", function () {
        test("returns true if the date is the same or before the other date", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSameOrBefore(date2)).toBe(false);
            expect(date2.isSameOrBefore(date)).toBe(true);
        });

        test("returns true if the date is the same or before the other date with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            expect(date.isSameOrBefore(date2, "day")).toBe(false);
            expect(date2.isSameOrBefore(date, "day")).toBe(true);
        });
    });

    describe("IsBetween()", function () {
        test("returns true if the date is between the two dates", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            const date3 = CoreDate.utc().add({ days: 1 });
            expect(date.isBetween(date2, date3)).toBe(true);
            expect(date2.isBetween(date, date3)).toBe(false);
        });

        test("returns true if the date is between the two dates with granularity", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc().subtract({ days: 1 });
            const date3 = CoreDate.utc().add({ days: 1 });
            expect(date.isBetween(date2, date3, "day")).toBe(true);
            expect(date2.isBetween(date, date3, "day")).toBe(false);
        });
    });

    describe("IsExpired()", function () {
        test("should return true if the date is expired", function () {
            const date = CoreDate.utc().subtract({ days: 1 });
            expect(date.isExpired()).toBe(true);
        });

        test("should return false if the date is not expired", function () {
            const date = CoreDate.utc().add({ days: 1 });
            expect(date.isExpired()).toBe(false);
        });
    });

    describe("Compare()", function () {
        test("should return 0 if the dates are equal", function () {
            const date = CoreDate.utc();
            const date2 = CoreDate.utc();
            expect(date.compare(date2)).toBe(0);
        });

        test("should return -1 if the date is before the other date", function () {
            const date = CoreDate.utc().subtract({ days: 1 });
            const date2 = CoreDate.utc();
            expect(date.compare(date2)).toBeLessThan(0);
        });

        test("should return 1 if the date is after the other date", function () {
            const date = CoreDate.utc().add({ days: 1 });
            const date2 = CoreDate.utc();
            expect(date.compare(date2)).toBeGreaterThan(0);
        });
    });
});
