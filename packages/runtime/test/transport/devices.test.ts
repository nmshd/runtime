import { CoreDate, LanguageISO639 } from "@nmshd/core-types";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices: TestRuntimeServices;

beforeAll(async () => {
    [runtimeServices] = await serviceProvider.launch(1);
}, 30000);
afterAll(async () => await serviceProvider.stop());

describe("Devices", () => {
    test("should set the communication language", async () => {
        const result = await runtimeServices.transport.devices.setCommunicationLanguage({ communicationLanguage: LanguageISO639.fr });
        expect(result).toBeSuccessful();
    });

    test("should not set the communication language with an invalid language", async () => {
        const result = await runtimeServices.transport.devices.setCommunicationLanguage({ communicationLanguage: "fra" as any as LanguageISO639 });
        expect(result).toBeAnError("communicationLanguage must be equal to one of the allowed values", "error.runtime.validation.invalidPropertyValue");
    });

    test.each(["truncated", "url"] as ("truncated" | "url")[])(
        "should fill the content of an empty token with a %s reference",
        async function (referenceType: "truncated" | "url") {
            const emptyTokenResult = await runtimeServices.anonymous.tokens.createEmptyToken();
            expect(emptyTokenResult).toBeSuccessful();

            const emptyToken = emptyTokenResult.value;

            const result = await runtimeServices.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.reference[referenceType] });
            expect(result).toBeSuccessful();
            expect(result.value.content["@type"]).toBe("TokenContentDeviceSharedSecret");
            expect(result.value.createdBy).toBe(runtimeServices.address);

            const deviceId = result.value.content.sharedSecret.id;

            const deviceResult = await runtimeServices.transport.devices.getDevice({ id: deviceId });
            expect(deviceResult).toBeSuccessful();

            const anonymousFetchedTokenResult = await runtimeServices.anonymous.tokens.loadPeerToken({ reference: emptyToken.reference.truncated });
            expect(anonymousFetchedTokenResult).toBeSuccessful();
            expect(anonymousFetchedTokenResult.value.content["@type"]).toBe("TokenContentDeviceSharedSecret");
            expect(anonymousFetchedTokenResult.value.createdBy).toBe(runtimeServices.address);
        }
    );

    test("should rollback the creation of a new device when updating the token failed", async function () {
        const testStartTime = CoreDate.utc();

        const createTokenResult = await runtimeServices.transport.tokens.createOwnToken({
            content: {},
            ephemeral: true,
            expiresAt: testStartTime.add({ minutes: 10 }).toISOString()
        });
        expect(createTokenResult).toBeSuccessful();

        const token = createTokenResult.value;

        const result = await runtimeServices.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: token.reference.truncated });
        expect(result).toBeAnError(/.*/, "error.runtime.devices.referenceNotPointingToAnEmptyToken");

        const devicesResult = await runtimeServices.transport.devices.getDevices();
        expect(devicesResult.value.filter((d) => CoreDate.from(d.createdAt).isAfter(testStartTime))).toHaveLength(0);
    });

    test("should update the current device", async () => {
        const newName = "Updated Device Name";
        const newDescription = "Updated Device Description";

        const updateResult = await runtimeServices.transport.devices.updateCurrentDevice({ name: newName, description: newDescription });
        expect(updateResult).toBeSuccessful();
        expect(updateResult.value.name).toBe(newName);
        expect(updateResult.value.description).toBe(newDescription);

        const devicesResult = await runtimeServices.transport.devices.getDevices();
        expect(devicesResult).toBeSuccessful();

        const currentDevice = devicesResult.value.find((d) => d.isCurrentDevice);
        expect(currentDevice).toBeDefined();
        expect(currentDevice!.name).toBe(newName);
        expect(currentDevice!.description).toBe(newDescription);
    });
});
