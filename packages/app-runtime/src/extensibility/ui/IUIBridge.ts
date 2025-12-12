import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { DeviceOnboardingInfoDTO, FileDVO, IdentityDVO, LocalRequestDVO, MailDVO, MessageDVO, RequestMessageDVO, ResolveAuthorizationRequestResponse } from "@nmshd/runtime";
import { LocalAccountDTO } from "../../multiAccount";

export interface IUIBridge {
    showMessage(account: LocalAccountDTO, relationship: IdentityDVO, message: MessageDVO | MailDVO | RequestMessageDVO): Promise<Result<void>>;
    showRelationship(account: LocalAccountDTO, relationship: IdentityDVO): Promise<Result<void>>;
    showFile(account: LocalAccountDTO, file: FileDVO): Promise<Result<void>>;
    showDeviceOnboarding(deviceOnboardingInfo: DeviceOnboardingInfoDTO): Promise<Result<void>>;
    showRequest(account: LocalAccountDTO, request: LocalRequestDVO): Promise<Result<void>>;
    showResolvedAuthorizationRequest(account: LocalAccountDTO, value: ResolveAuthorizationRequestResponse): Promise<Result<void>>;
    showResolvedCredentialOffer(account: LocalAccountDTO, credentialResponses: OpenId4VciCredentialResponseJSON[], issuesDisplayInformation: any): Promise<Result<void>>;
    showError(error: ApplicationError, account?: LocalAccountDTO): Promise<Result<void>>;
    requestAccountSelection(possibleAccounts: LocalAccountDTO[], title?: string, description?: string): Promise<Result<LocalAccountDTO | undefined>>;
    enterPassword(passwordType: "pw" | "pin", pinLength?: number, attempt?: number, passwordLocationIndicator?: number): Promise<Result<string>>;
}
