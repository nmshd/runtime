import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IUIBridge, LocalAccountDTO } from "../../src";

export class FakeUIBridge implements IUIBridge {
    public showMessage(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public showRelationship(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public showFile(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public showDeviceOnboarding(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public showRequest(): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showError(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public requestAccountSelection(): Promise<Result<LocalAccountDTO | undefined, ApplicationError>> {
        throw new Error("Method not implemented.");
    }

    public enterPassword(_passwordType: "pw" | "pin", _pinLength: number | undefined): Promise<Result<string>> {
        throw new Error("Method not implemented.");
    }
}
