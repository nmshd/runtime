import { PasswordGenerator } from "@nmshd/transport";

describe("PasswordGeneratorTest", function () {
    describe("CreatePassword", function () {
        test("should return a fixed length password", async function () {
            for (let i = 1; i < 20; i++) {
                const pass = await PasswordGenerator.createPassword(i);
                expect(pass).toHaveLength(i);
            }
        });

        test("should return a random length password within the range", async function () {
            for (let i = 1; i < 20; i++) {
                const pass = await PasswordGenerator.createPassword(6, 10);

                expect(pass.length).toBeGreaterThanOrEqual(6);
                expect(pass.length).toBeLessThanOrEqual(10);
            }
        });
    });

    describe("CreateStrongPassword", function () {
        test("should return a random password with a dynamic size", async function () {
            for (let i = 1; i < 20; i++) {
                const password = await PasswordGenerator.createStrongPassword();

                expect(password.length).toBeGreaterThanOrEqual(8);
                expect(password.length).toBeLessThanOrEqual(12);
            }
        });

        test("should return a random password with the correct given fix length", async function () {
            for (let i = 1; i < 20; i++) {
                const pass = await PasswordGenerator.createStrongPassword(50, 50);
                expect(pass).toHaveLength(50);
            }
        });

        test("should return a random password with the correct given length interval", async function () {
            for (let i = 1; i < 20; i++) {
                const pass = await PasswordGenerator.createStrongPassword(20, 50);

                expect(pass.length).toBeGreaterThanOrEqual(19);
                expect(pass.length).toBeLessThanOrEqual(51);
            }
        });

        test("should throw an error if minLength is too low", async function () {
            for (let i = 1; i < 20; i++) {
                await expect(PasswordGenerator.createStrongPassword(2, 20)).rejects.toThrow("Minimum password length for a strong password should be 8 characters.");
            }
        });
    });

    describe("CreateUnitPassword", function () {
        test("should return a random password", async function () {
            for (let i = 1; i < 20; i++) {
                const pass = await PasswordGenerator.createUnitPassword();
                expect(pass.length).toBeGreaterThanOrEqual(5);
                expect(pass.length).toBeLessThanOrEqual(30);
            }
        });
    });
});
