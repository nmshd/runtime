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

    public showDeviceOnboarding(_deviceOnboardingInfo: DeviceOnboardingInfoDTO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showRequest(_account: LocalAccountDTO, _request: LocalRequestDVO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public showError(_error: UserfriendlyApplicationError, _account?: LocalAccountDTO): Promise<Result<void>> {
        throw new Error("Method not implemented.");
    }

    public requestAccountSelection(possibleAccounts: LocalAccountDTO[], _title?: string, _description?: string): Promise<Result<LocalAccountDTO | undefined>> {
        if (!this._accountIdToReturn) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        const foundAccount = possibleAccounts.find((x) => x.id === this._accountIdToReturn);
        if (!foundAccount) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(foundAccount));
    }

    public enterPassword(_passwordType: "pw" | "pin", _pinLength?: number): Promise<Result<string>> {
        if (!this._passwordToReturn) return Promise.resolve(Result.fail(new ApplicationError("code", "message")));

        return Promise.resolve(Result.ok(this._passwordToReturn));
    }
}
