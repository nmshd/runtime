import { Result } from "@js-soft/ts-utils";
import { DeviceOnboardingInfoDTO, FileDVO, IdentityDVO, LocalRequestDVO, MailDVO, MessageDVO, RequestMessageDVO } from "@nmshd/runtime";
import { UserfriendlyApplicationError } from "../../UserfriendlyApplicationError";
import { LocalAccountDTO } from "../../multiAccount";

export interface IUIBridge {
    showMessage(account: LocalAccountDTO, relationship: IdentityDVO, message: MessageDVO | MailDVO | RequestMessageDVO): Promise<Result<void>>;
    showRelationship(account: LocalAccountDTO, relationship: IdentityDVO): Promise<Result<void>>;
    showFile(account: LocalAccountDTO, file: FileDVO): Promise<Result<void>>;
    showDeviceOnboarding(deviceOnboardingInfo: DeviceOnboardingInfoDTO): Promise<Result<void>>;
    showRequest(account: LocalAccountDTO, request: LocalRequestDVO): Promise<Result<void>>;
    showError(error: UserfriendlyApplicationError, account?: LocalAccountDTO): Promise<Result<void>>;
    requestAccountSelection(possibleAccounts: LocalAccountDTO[], title?: string, description?: string): Promise<Result<LocalAccountDTO | undefined>>;
    enterPassword(passwordType: "pw" | "pin", pinLength?: number, attempt?: number, passwordLocationIndicator?: number): Promise<Result<string>>;
}
