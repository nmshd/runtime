import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IUIBridge, LocalAccountDTO } from "../../src";

export class FakeUIBridge implements IUIBridge {
    public showMessage(): Promise<Result<void, ApplicationError>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showRelationship(): Promise<Result<void, ApplicationError>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showFile(): Promise<Result<void, ApplicationError>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showDeviceOnboarding(): Promise<Result<void, ApplicationError>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showRequest(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showResolvedAuthorizationRequest(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showResolvedCredentialOffer(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public showError(): Promise<Result<void, ApplicationError>> {
        return Promise.resolve(Result.ok(undefined));
    }

    public requestAccountSelection(): Promise<Result<LocalAccountDTO | undefined, ApplicationError>> {
        return Promise.resolve(Result.fail(new ApplicationError("not implemented", "not implemented")));
    }

    public enterPassword(_passwordType: "pw" | "pin", _pinLength?: number, _attempt?: number): Promise<Result<string>> {
        return Promise.resolve(Result.fail(new ApplicationError("not implemented", "not implemented")));
    }

    public performOauthAuthentication(_authenticationServerUrl: string): Promise<Result<string>> {
        return Promise.resolve(Result.fail(new ApplicationError("not implemented", "not implemented")));
    }
}
