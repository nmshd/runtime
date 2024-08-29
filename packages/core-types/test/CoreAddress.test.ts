import { CoreAddress } from "../src";

describe("CoreAddress", function () {
    describe("From()", function () {
        test("returns an address when provided with an ICoreAddress", function () {
            const address = CoreAddress.from({ address: "address" });
            expect(address).toBeDefined();
        });

        test("returns an address when provided with a string", function () {
            const address = CoreAddress.from("address");
            expect(address).toBeDefined();
        });
    });

    describe("Equals()", function () {
        test("should return true if the addresses are equal", function () {
            const address = CoreAddress.from("address");
            expect(address.equals("address")).toBe(true);
        });

        test("should return false if the addresses are not equal", function () {
            const address = CoreAddress.from("address");
            expect(address.equals("address2")).toBe(false);
        });

        test("should return false if the address is undefined", function () {
            const address = CoreAddress.from("address");
            expect(address.equals(undefined)).toBe(false);
        });
    });

    describe("ToString()", function () {
        test("should return the address as a string", function () {
            const address = CoreAddress.from("address");
            expect(address.toString()).toBe("address");
        });
    });

    describe("Serialize()", function () {
        test("should return the address as a string", function () {
            const address = CoreAddress.from("address");
            expect(address.serialize()).toBe("address");
        });
    });
});
