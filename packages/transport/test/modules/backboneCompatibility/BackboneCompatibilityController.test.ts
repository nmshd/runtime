import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { BackboneCompatibilityController, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("AccountController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let actualBackboneVersion: number;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        actualBackboneVersion = (await new BackboneCompatibilityController({ ...transport.config }).getBackboneMajorVersion()).value;
    });

    afterAll(async function () {
        await connection.close();
    });

    test("should correctly check a valid backbone version with exact same min and max version of the backbone", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion,
            supportedMaxBackboneVersion: actualBackboneVersion
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.isSuccess).toBe(true);
    });

    test("should correctly check a valid backbone version with version in bounds of min and max", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion - 1,
            supportedMaxBackboneVersion: actualBackboneVersion + 1
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.isSuccess).toBe(true);
    });

    test("should catch a too low backbone version", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion + 1,
            supportedMaxBackboneVersion: actualBackboneVersion + 2
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });

    test("should catch a too high backbone version", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion - 1,
            supportedMaxBackboneVersion: actualBackboneVersion - 1
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();
        expect(versionCheckResult.error.code).toBe("error.transport.files.runtimeVersionIncompatibleWithBackboneVersion");
    });
});
