import { DeviceOnboardingInfoDTO } from "@nmshd/runtime";
import { MockUIBridge } from "./MockUIBridge.js";

expect.extend({
    showDeviceOnboardingCalled(mockUIBridge: unknown, predicate: (deviceOnboardingInfo: DeviceOnboardingInfoDTO) => boolean) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showDeviceOnboarding");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method showDeviceOnboarding was not called." };
        }

        const matchingCalls = calls.filter((x) => predicate(x.deviceOnboardingInfo));
        if (matchingCalls.length === 0) {
            return {
                pass: false,
                message: () =>
                    `The method showDeviceOnboarding was called, but not with the specified predicate, instead with payloads '${calls.map((e) => JSON.stringify(e.deviceOnboardingInfo)).join(", ")}'.`
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
    enterPasswordCalled(mockUIBridge: unknown, passwordType: "pw" | "pin", pinLength?: number, attempt?: number, passwordLocationIndicator?: number) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "enterPassword");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method enterPassword was not called." };
        }

        const matchingCalls = calls.filter(
            (x) => x.passwordType === passwordType && x.pinLength === pinLength && x.attempt === (attempt ?? 1) && x.passwordLocationIndicator === passwordLocationIndicator
        );
        if (matchingCalls.length === 0) {
            const parameters = calls
                .map((e) => {
                    return { passwordType: e.passwordType, pinLength: e.pinLength, attempt: e.attempt, passwordLocationIndicator: e.passwordLocationIndicator };
                })
                .map((e) => JSON.stringify(e))
                .join(", ");

            return {
                pass: false,
                message: () =>
                    `The method enterPassword was called, but not with the specified password type '${passwordType}', pin length '${pinLength}', attempt '${attempt}' and passwordLocationIndicator '${passwordLocationIndicator}', instead with parameters '${parameters}'.`
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
    },
    showRequestCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showRequest");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method showRequest was not called." };
        }

        return { pass: true, message: () => "" };
    },
    showRequestNotCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showRequest");
        if (calls.length > 0) {
            return { pass: false, message: () => `The method showRequest called: ${calls.map((c) => `'account id: ${c.account.id} - requestId: ${c.request.id}'`)}` };
        }

        return { pass: true, message: () => "" };
    },
    showFileCalled(mockUIBridge: unknown, id: string) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showFile");
        if (calls.length === 0) {
            return { pass: false, message: () => "The method showFile was not called." };
        }

        const matchingCalls = calls.filter((x) => x.file.id === id);
        if (matchingCalls.length === 0) {
            return {
                pass: false,
                message: () => `The method showFile was called, but not with the specified file id '${id}', instead with ids '${calls.map((e) => e.file.id).join(", ")}'.`
            };
        }

        return { pass: true, message: () => "" };
    },
    showFileNotCalled(mockUIBridge: unknown) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const calls = mockUIBridge.calls.filter((x) => x.method === "showFile");
        if (calls.length > 0) {
            return { pass: false, message: () => `The method showFile called: ${calls.map((c) => `'account id: ${c.account.id} - fileId: ${c.file.id}'`)}` };
        }

        return { pass: true, message: () => "" };
    },
    showErrorCalled(mockUIBridge: unknown, code: string) {
        if (!(mockUIBridge instanceof MockUIBridge)) {
            throw new Error("This method can only be used with expect(MockUIBridge).");
        }

        const errorCalls = mockUIBridge.calls.filter((x) => x.method === "showError");
        if (errorCalls.length === 0) {
            return { pass: false, message: () => "The method showError was not called." };
        }

        const errorCallsWithCode = errorCalls.filter((x) => x.error.code === code);
        if (errorCallsWithCode.length === 0) {
            return {
                pass: false,
                message: () => `The method showRequest was called but not with the code '${code}' instead with the codes: ${errorCalls.map((c) => `'${c.error.code}'`).join(", ")}`
            };
        }

        return { pass: true, message: () => "" };
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            showDeviceOnboardingCalled(predicate: (deviceOnboardingInfo: DeviceOnboardingInfoDTO) => boolean): R;
            showDeviceOnboardingNotCalled(): R;
            requestAccountSelectionCalled(possibleAccountsLength: number): R;
            requestAccountSelectionNotCalled(): R;
            enterPasswordCalled(passwordType: "pw" | "pin", pinLength?: number, attempt?: number, passwordLocationIndicator?: number): R;
            enterPasswordNotCalled(): R;
            showRequestCalled(): R;
            showRequestNotCalled(): R;
            showFileCalled(id: string): R;
            showFileNotCalled(): R;
            showErrorCalled(code: string): R;
        }
    }
}
