import { CoreDate } from "@nmshd/core-types";
import { TokenReference } from "@nmshd/transport";
import { DeviceDTO } from "src";
import { RuntimeServiceProvider, TestRuntimeServices } from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Password-protected DeviceOnboardingTokens", () => {
    let device: DeviceDTO;

    beforeAll(async () => {
        device = (await runtimeServices1.transport.devices.createDevice({})).value;
    });

    test("send and receive a password-protected DeviceOnboardingToken", async () => {
        const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } })).value;
        expect(deviceOnboardingToken.passwordProtection?.password).toBe("password");
        expect(deviceOnboardingToken.passwordProtection?.passwordIsPin).toBeUndefined();

        const reference = TokenReference.from(deviceOnboardingToken.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pw");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: deviceOnboardingToken.truncatedReference, ephemeral: true, password: "password" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("password");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBeUndefined();
    });

    test("send and receive a PIN-protected DeviceOnboardingToken", async () => {
        const deviceOnboardingToken = (
            await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "1234", passwordIsPin: true } })
        ).value;
        expect(deviceOnboardingToken.passwordProtection?.password).toBe("1234");
        expect(deviceOnboardingToken.passwordProtection?.passwordIsPin).toBe(true);

        const reference = TokenReference.from(deviceOnboardingToken.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pin4");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: deviceOnboardingToken.truncatedReference, ephemeral: true, password: "1234" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("1234");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBe(true);
    });

    test("send DeviceOnboardingToken with passwordLocationIndicator", async () => {
        const deviceOnboardingToken = (
            await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password", passwordLocationIndicator: 50 } })
        ).value;
        expect(deviceOnboardingToken.passwordProtection!.passwordLocationIndicator).toBe(50);

        const reference = TokenReference.from(deviceOnboardingToken.truncatedReference);
        expect(reference.passwordProtection!.passwordLocationIndicator).toBe(50);
    });

    test("error when loading a DeviceOnboardingToken with a wrong password", async () => {
        const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } })).value;

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: deviceOnboardingToken.truncatedReference,
            ephemeral: true,
            password: "wrong-password"
        });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading a DeviceOnboardingToken with no password", async () => {
        const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } })).value;

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: deviceOnboardingToken.truncatedReference,
            ephemeral: true
        });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a DeviceOnboardingToken with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "" }
        });

        expect(createResult).toBeAnError("password must NOT have fewer than 1 characters", "error.runtime.validation.invalidPropertyValue");
    });

    test("validation error when creating a DeviceOnboardingToken with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(
            "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromTruncatedReferenceUseCase", () => {
        test("send and receive a password-protected DeviceOnboardingToken", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: deviceOnboardingToken.truncatedReference,
                password: "password"
            });
            expect(loadResult).toBeSuccessful();
            expect(loadResult.value.type).toBe("DeviceOnboardingInfo");
        });

        test("error when loading a DeviceOnboardingToken with a wrong password", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: deviceOnboardingToken.truncatedReference,
                password: "wrong-password"
            });
            expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a DeviceOnboardingToken with no password", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromTruncatedReference({ reference: deviceOnboardingToken.truncatedReference });
            expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});
