import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { TestUtil } from "test/testHelpers/TestUtil";
import { BackboneCompatibilityController, Transport } from "../../../src";

describe("AccountController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();
    });

    afterAll(async function () {
        await connection.close();
    });

    test("should correctly check a valid backbone version", async function () {
        const versionController = new BackboneCompatibilityController({ ...transport.config, supportedMinBackboneVersion: 1, supportedMaxBackboneVersion: 5000 });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.isSuccess).toBe(true);
    });

    test("should catch a too low backbone version", async function () {
        const versionController = new BackboneCompatibilityController({ ...transport.config, supportedMinBackboneVersion: 5000, supportedMaxBackboneVersion: 6000 });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });

    test("should catch a too high backbone version", async function () {
        const versionController = new BackboneCompatibilityController({ ...transport.config, supportedMinBackboneVersion: 1, supportedMaxBackboneVersion: 2 });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });
});
