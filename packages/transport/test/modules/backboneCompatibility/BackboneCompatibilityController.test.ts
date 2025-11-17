import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { BackboneCompatibilityController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../testHelpers/TestUtil.js";

describe("BackboneCompatibility", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let actualBackboneVersion: number;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        actualBackboneVersion = (await new BackboneCompatibilityController({ ...transport.config })["client"].getBackboneVersion()).value.majorVersion;
    });

    afterAll(async function () {
        await connection.close();
    });

    test("should correctly check a valid Backbone version with exact same min and max version of the Backbone", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion,
            supportedMaxBackboneVersion: actualBackboneVersion
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();

        expect(versionCheckResult.value.isCompatible).toBe(true);
    });

    test("should correctly check a valid Backbone version with version in bounds of min and max", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion - 1,
            supportedMaxBackboneVersion: actualBackboneVersion + 1
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();

        expect(versionCheckResult.value.isCompatible).toBe(true);
    });

    test("should catch a too low Backbone version", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion + 1,
            supportedMaxBackboneVersion: actualBackboneVersion + 1
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();

        expect(versionCheckResult.value.isCompatible).toBe(false);
    });

    test("should catch a too high Backbone version", async function () {
        const versionController = new BackboneCompatibilityController({
            ...transport.config,
            supportedMinBackboneVersion: actualBackboneVersion - 1,
            supportedMaxBackboneVersion: actualBackboneVersion - 1
        });

        const versionCheckResult = await versionController.checkBackboneCompatibility();

        expect(versionCheckResult.value.isCompatible).toBe(false);
    });
});
