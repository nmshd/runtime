import { MockUIBridge } from "./MockUIBridge";

expect.extend({
    showDeviceOnboardingCalled(mockUIBridge: unknown, deviceId: string) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showDeviceOnboarding");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method showDeviceOnboarding was not called." };
        }

        const matchingCalls = calls.filter((x) => x.deviceOnboardingInfo.id === deviceId);
        if (matchingCalls.length === 0) {
            return {
                pass: false,
                message: () =>
                    `The method showDeviceOnboarding was called, but not with the specified device id '${deviceId}', instead with ids '${calls.map((e) => e.deviceOnboardingInfo.id).join(", ")}'.`
            };
        }

        return { pass: true, message: () => "" };
    },
    showDeviceOnboardingNotCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showDeviceOnboarding");
        if (calls.length > 0) {
            return { pass: false, message: () => "The method showDeviceOnboarding was called." };
        }

        return { pass: true, message: () => "" };
    },
    requestAccountSelectionCalled(mockUIBridge: unknown, possibleAccountsLength: number) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "requestAccountSelection");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method requestAccountSelection was not called." };
        }

        const matchingCalls = calls.filter((x) => x.possibleAccounts.length === possibleAccountsLength);
        if (matchingCalls.length === 0) {
            return {
                pass: false,
                message: () =>
                    `The method requestAccountSelection was called, but not with the specified possible accounts length '${possibleAccountsLength}', instead with lengths '${calls.map((e) => e.possibleAccounts.length).join(", ")}'.`
            };
        }

        return { pass: true, message: () => "" };
    },
    requestAccountSelectionNotCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "requestAccountSelection");
        if (calls.length > 0) {
            return { pass: false, message: () => "The method requestAccountSelection was called." };
        }

        return { pass: true, message: () => "" };
    },
    enterPasswordCalled(mockUIBridge: unknown, passwordType: "pw" | "pin", pinLength?: number, iteration?: number) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "enterPassword");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method enterPassword was not called." };
        }

        const matchingCalls = calls.filter((x) => x.passwordType === passwordType && x.pinLength === pinLength && x.iteration === iteration);
        if (matchingCalls.length === 0) {
            const parameters = calls
                .map((e) => {
                    return { passwordType: e.passwordType, pinLength: e.pinLength, iteration: e.iteration };
                })
                .join(", ");

            return {
                pass: false,
                message: () =>
                    `The method enterPassword was called, but not with the specified password type '${passwordType}' and pin length '${pinLength}', instead with parameters '${parameters}'.`
            };
        }

        return { pass: true, message: () => "" };
    },
    enterPasswordNotCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "enterPassword");
        if (calls.length > 0) {
            return { pass: false, message: () => "The method enterPassword was called." };
        }

        return { pass: true, message: () => "" };
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            showDeviceOnboardingCalled(deviceId: string): R;
            showDeviceOnboardingNotCalled(): R;
            requestAccountSelectionCalled(possibleAccountsLength: number): R;
            requestAccountSelectionNotCalled(): R;
            enterPasswordCalled(passwordType: "pw" | "pin", pinLength?: number, iteration?: number): R;
            enterPasswordNotCalled(): R;
        }
    }
}
