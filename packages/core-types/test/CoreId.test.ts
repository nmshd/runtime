import { CoreId } from "../src";

describe("CoreId", function () {
    describe("From()", function () {
        test("returns an id when provided with an ICoreId", function () {
            const id = CoreId.from({ id: "id" });
            expect(id).toBeDefined();
        });

        test("returns an id when provided with a string", function () {
            const id = CoreId.from("id");
            expect(id).toBeDefined();
        });
    });

    describe("Equals()", function () {
        test("should return true if the ids are equal", function () {
            const id = CoreId.from("id");
            expect(id.equals("id")).toBe(true);
        });

        test("should return false if the ids are not equal", function () {
            const id = CoreId.from("id");
            expect(id.equals("id2")).toBe(false);
        });

        test("should return true if the id is the same CoreId", function () {
            const id = CoreId.from("id");
            expect(id.equals(CoreId.from("id"))).toBe(true);
        });
    });

    describe("ToString()", function () {
        test("should return the id as a string", function () {
            const id = CoreId.from("id");
            expect(id.toString()).toBe("id");
        });
    });

    describe("Serialize()", function () {
        test("should return the id as a string", function () {
            const id = CoreId.from("id");
            expect(id.serialize()).toBe("id");
        });
    });
});
