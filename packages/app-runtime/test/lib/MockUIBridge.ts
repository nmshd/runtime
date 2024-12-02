import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DeviceOnboardingInfoDTO, FileDVO, IdentityDVO, LocalRequestDVO, MailDVO, MessageDVO, RequestMessageDVO } from "@nmshd/runtime";
import { IUIBridge, LocalAccountDTO, UserfriendlyApplicationError } from "../../src";

export class MockUIBridge implements IUIBridge {
    private _accountIdToReturn: string | undefined;
    public set accountIdToReturn(value: string | undefined) {
        this._accountIdToReturn = value;
    }

    private _passwordToReturn: string | undefined;
    public set passwordToReturn(value: string | undefined) {
        this._passwordToReturn = value;
    }

    public reset(): void {
        this._passwordToReturn = undefined;
        this._accountIdToReturn = undefined;

        this._showDeviceOnboardingCalls = [];
        this._requestAccountSelectionCalls = [];
        this._enterPasswordCalls = [];
    }

    public showMessage(_account: LocalAccountDTO, _relationship: IdentityDVO, _message: MessageDVO | MailDVO | RequestMessageDVO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showRelationship(_account: LocalAccountDTO, _relationship: IdentityDVO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showFile(_account: LocalAccountDTO, _file: FileDVO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showDeviceOnboarding(deviceOnboardingInfo: DeviceOnboardingInfoDTO): Promise<Result<void>> {
        this._showDeviceOnboardingCalls.push(deviceOnboardingInfo);

        return Promise.resolve(Result.ok(undefined));
    }

    private _showDeviceOnboardingCalls: DeviceOnboardingInfoDTO[] = [];
    public showDeviceOnboardingCalled(deviceId: string): boolean {
        return this._showDeviceOnboardingCalls.some((x) => x.id === deviceId);
    }

    public showDeviceOnboardingNotCalled(): boolean {
        return this._showDeviceOnboardingCalls.length === 0;
    }

    public showRequest(_account: LocalAccountDTO, _request: LocalRequestDVO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showError(_error: UserfriendlyApplicationError, _account?: LocalAccountDTO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public requestAccountSelection(possibleAccounts: LocalAccountDTO[], title?: string, description?: string): Promise<Result<LocalAccountDTO | undefined>> {
        this._requestAccountSelectionCalls.push({ possibleAccounts: possibleAccounts, title: title, description: description });

        if (!this._accountIdToReturn) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        const foundAccount = possibleAccounts.find((x) => x.id === this._accountIdToReturn);
        if (!foundAccount) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(foundAccount));
    }

    private _requestAccountSelectionCalls: { possibleAccounts: LocalAccountDTO[]; title?: string; description?: string }[] = [];
    public requestAccountSelectionCalled(possibleAccountsLength: number): boolean {
        return this._requestAccountSelectionCalls.some((x) => x.possibleAccounts.length === possibleAccountsLength);
    }

    public requestAccountSelectionNotCalled(): boolean {
        return this._requestAccountSelectionCalls.length === 0;
    }

    public enterPassword(passwordType: "pw" | "pin", pinLength?: number): Promise<Result<string>> {
        this._enterPasswordCalls.push({ passwordType: passwordType, pinLength: pinLength });

        if (!this._passwordToReturn) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(this._passwordToReturn));
    }

    private _enterPasswordCalls: { passwordType: "pw" | "pin"; pinLength?: number }[] = [];
    public enterPasswordCalled(passwordType: "pw" | "pin", pinLength?: number): boolean {
        return this._enterPasswordCalls.some((x) => x.passwordType === passwordType && x.pinLength === pinLength);
    }

    public enterPasswordNotCalled(): boolean {
        return this._enterPasswordCalls.length === 0;
    }
}
