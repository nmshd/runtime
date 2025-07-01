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

        const reference = TokenReference.from(deviceOnboardingToken.reference.truncated);
        expect(reference.passwordProtection!.passwordType).toBe("pw");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: deviceOnboardingToken.reference.truncated, ephemeral: true, password: "password" });
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

        const reference = TokenReference.from(deviceOnboardingToken.reference.truncated);
        expect(reference.passwordProtection!.passwordType).toBe("pin4");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: deviceOnboardingToken.reference.truncated, ephemeral: true, password: "1234" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("1234");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBe(true);
    });

    test("send DeviceOnboardingToken with passwordLocationIndicator", async () => {
        const deviceOnboardingToken = (
            await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password", passwordLocationIndicator: 50 } })
        ).value;
        expect(deviceOnboardingToken.passwordProtection!.passwordLocationIndicator).toBe(50);

        const reference = TokenReference.from(deviceOnboardingToken.reference.truncated);
        expect(reference.passwordProtection!.passwordLocationIndicator).toBe(50);
    });

    test("error when loading a DeviceOnboardingToken with a wrong password", async () => {
        const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } })).value;

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: deviceOnboardingToken.reference.truncated,
            ephemeral: true,
            password: "wrong-password"
        });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading a DeviceOnboardingToken with no password", async () => {
        const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } })).value;

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: deviceOnboardingToken.reference.truncated,
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

    test("validation error when creating a DeviceOnboardingToken with a PasswordLocationIndicator that is an invalid string", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "password", passwordLocationIndicator: "invalid-password-location-indicator" as any }
        });
        expect(createResult).toBeAnError(
            /^must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website$/,
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a DeviceOnboardingToken with a PasswordLocationIndicator that is an invalid number", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "password", passwordLocationIndicator: 100 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a DeviceOnboardingToken with a PasswordLocationIndicator that is a number mapping to a PasswordLocationIndicatorOption", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "password", passwordLocationIndicator: 1 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    test("validation error when creating a DeviceOnboardingToken with a PasswordLocationIndicator that is a number mapping to RecoveryKit", async () => {
        const createResult = await runtimeServices1.transport.devices.createDeviceOnboardingToken({
            id: device.id,
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            passwordProtection: { password: "password", passwordLocationIndicator: 0 as any }
        });
        expect(createResult).toBeAnError(
            "must be a number from 50 to 99 or one of the following strings: Self, Letter, RegistrationLetter, Email, SMS, Website",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromReferenceUseCase", () => {
        test("send and receive a password-protected DeviceOnboardingToken", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({
                reference: deviceOnboardingToken.reference.truncated,
                password: "password"
            });
            expect(loadResult).toBeSuccessful();
            expect(loadResult.value.type).toBe("DeviceOnboardingInfo");
        });

        test("error when loading a DeviceOnboardingToken with a wrong password", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({
                reference: deviceOnboardingToken.reference.truncated,
                password: "wrong-password"
            });
            expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a DeviceOnboardingToken with no password", async () => {
            const deviceOnboardingToken = (await runtimeServices1.transport.devices.createDeviceOnboardingToken({ id: device.id, passwordProtection: { password: "password" } }))
                .value;

            const loadResult = await runtimeServices2.transport.account.loadItemFromReference({ reference: deviceOnboardingToken.reference.truncated });
            expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});
