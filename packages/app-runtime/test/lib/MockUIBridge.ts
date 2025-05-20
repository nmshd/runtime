import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DeviceOnboardingInfoDTO, FileDVO, IdentityDVO, LocalRequestDVO, MailDVO, MessageDVO, RequestMessageDVO } from "@nmshd/runtime";
import { IUIBridge, LocalAccountDTO } from "../../src";

export type MockUIBridgeCall =
    | { method: "showMessage"; account: LocalAccountDTO; relationship: IdentityDVO; message: MessageDVO | MailDVO | RequestMessageDVO }
    | { method: "showRelationship"; account: LocalAccountDTO; relationship: IdentityDVO }
    | { method: "showFile"; account: LocalAccountDTO; file: FileDVO }
    | { method: "showDeviceOnboarding"; deviceOnboardingInfo: DeviceOnboardingInfoDTO }
    | { method: "showRequest"; account: LocalAccountDTO; request: LocalRequestDVO }
    | { method: "showError"; error: ApplicationError; account?: LocalAccountDTO }
    | { method: "requestAccountSelection"; possibleAccounts: LocalAccountDTO[]; title?: string; description?: string }
    | { method: "enterPassword"; passwordType: "pw" | "pin"; pinLength?: number; attempt?: number; passwordLocationIndicator?: number };

export class MockUIBridge implements IUIBridge {
    private _accountIdToReturn: string | undefined;
    public set accountIdToReturn(value: string | undefined) {
        this._accountIdToReturn = value;
    }

    private _passwordToReturnForAttempt: Record<number, string> = {};
    public setPasswordToReturnForAttempt(attempt: number, password: string): void {
        this._passwordToReturnForAttempt[attempt] = password;
    }

    private _calls: MockUIBridgeCall[] = [];
    public get calls(): MockUIBridgeCall[] {
        return this._calls;
    }

    public reset(): void {
        this._accountIdToReturn = undefined;
        this._passwordToReturnForAttempt = {};

        this._calls = [];
    }

    public showMessage(_account: LocalAccountDTO, _relationship: IdentityDVO, _message: MessageDVO | MailDVO | RequestMessageDVO): Promise<Result<void>> {
        this._calls.push({ method: "showMessage", account: _account, relationship: _relationship, message: _message });

        return Promise.resolve(Result.ok(undefined));
    }

    public showRelationship(account: LocalAccountDTO, relationship: IdentityDVO): Promise<Result<void>> {
        this._calls.push({ method: "showRelationship", account, relationship });

        return Promise.resolve(Result.ok(undefined));
    }

    public showFile(account: LocalAccountDTO, file: FileDVO): Promise<Result<void>> {
        this._calls.push({ method: "showFile", account, file });

        return Promise.resolve(Result.ok(undefined));
    }

    public showDeviceOnboarding(deviceOnboardingInfo: DeviceOnboardingInfoDTO): Promise<Result<void>> {
        this._calls.push({ method: "showDeviceOnboarding", deviceOnboardingInfo });

        return Promise.resolve(Result.ok(undefined));
    }

    public showRequest(account: LocalAccountDTO, request: LocalRequestDVO): Promise<Result<void>> {
        this._calls.push({ method: "showRequest", account, request });

        return Promise.resolve(Result.ok(undefined));
    }

    public showError(error: ApplicationError, account?: LocalAccountDTO): Promise<Result<void>> {
        this._calls.push({ method: "showError", error, account });

        return Promise.resolve(Result.ok(undefined));
    }

    public requestAccountSelection(possibleAccounts: LocalAccountDTO[], title?: string, description?: string): Promise<Result<LocalAccountDTO | undefined>> {
        this._calls.push({ method: "requestAccountSelection", possibleAccounts, title, description });

        if (!this._accountIdToReturn) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        const foundAccount = possibleAccounts.find((x) => x.id === this._accountIdToReturn);
        if (!foundAccount) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(foundAccount));
    }

    public enterPassword(passwordType: "pw" | "pin", pinLength?: number, attempt?: number, passwordLocationIndicator?: number): Promise<Result<string>> {
        this._calls.push({ method: "enterPassword", passwordType, pinLength, attempt, passwordLocationIndicator });

        const password = this._passwordToReturnForAttempt[attempt ?? 1];
        if (!password) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(password));
    }
}
