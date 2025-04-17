import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { EventBus, Result } from "@js-soft/ts-utils";
import { ICoreAddress, Reference, SharedPasswordProtection } from "@nmshd/core-types";
import { AnonymousServices, Base64ForIdPrefix, DeviceMapper } from "@nmshd/runtime";
import { TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { AppRuntimeErrors } from "./AppRuntimeErrors";
import { AppRuntimeServices } from "./AppRuntimeServices";
import { IUIBridge } from "./extensibility";
import { AccountServices, LocalAccountDTO, LocalAccountSession } from "./multiAccount";
import { UserfriendlyApplicationError } from "./UserfriendlyApplicationError";
import { UserfriendlyResult } from "./UserfriendlyResult";

export class AppStringProcessor {
    private readonly logger: ILogger;

    public constructor(
        protected readonly runtime: {
            get anonymousServices(): AnonymousServices;
            get accountServices(): AccountServices;
            uiBridge(): Promise<IUIBridge> | IUIBridge;
            getServices(accountReference: string | ICoreAddress): Promise<AppRuntimeServices>;
            translate(key: string, ...values: any[]): Promise<Result<string>>;
            get eventBus(): EventBus;
            selectAccount(accountReference: string): Promise<LocalAccountSession>;
        },
        loggerFactory: ILoggerFactory
    ) {
        this.logger = loggerFactory.getLogger(this.constructor);
    }

    public async processURL(url: string, account?: LocalAccountDTO): Promise<UserfriendlyResult<void>> {
        url = url.trim();

        const prefix = url.substring(0, 11);
        if (prefix.startsWith("nmshd://qr#") || prefix === "nmshd://tr#") {
            return await this.processTruncatedReference(url.substring(11), account);
        }

        return UserfriendlyResult.fail(AppRuntimeErrors.startup.wrongURL());
    }

    public async processTruncatedReference(truncatedReference: string, account?: LocalAccountDTO): Promise<UserfriendlyResult<void>> {
        let reference: Reference;
        try {
            reference = Reference.fromTruncated(truncatedReference);
        } catch (_) {
            return UserfriendlyResult.fail(
                new UserfriendlyApplicationError("error.appStringProcessor.truncatedReferenceInvalid", "The given code does not contain a valid truncated reference.")
            );
        }

        if (account) return await this._handleReference(reference, account);

        // process Files and RelationshipTemplates and ask for an account
        if (truncatedReference.startsWith(Base64ForIdPrefix.File) || truncatedReference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            const result = await this.selectAccount(reference.forIdentityTruncated);
            if (result.isError) {
                this.logger.info("Could not query account", result.error);
                return UserfriendlyResult.fail(result.error);
            }

            if (!result.value) {
                this.logger.info("User cancelled account selection");
                return UserfriendlyResult.ok(undefined);
            }

            return await this._handleReference(reference, result.value);
        }

        if (!truncatedReference.startsWith(Base64ForIdPrefix.Token)) {
            const error = AppRuntimeErrors.startup.wrongCode();
            return UserfriendlyResult.fail(error);
        }

        const uiBridge = await this.runtime.uiBridge();

        const tokenResultHolder = reference.passwordProtection
            ? await this._fetchPasswordProtectedItemWithRetry(
                  async (password) => await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: truncatedReference, password }),
                  reference.passwordProtection
              )
            : { result: await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: truncatedReference }) };

        if (tokenResultHolder.result.isError && tokenResultHolder.result.error.code === "error.appStringProcessor.passwordNotProvided") {
            return UserfriendlyResult.ok(undefined);
        }

        if (tokenResultHolder.result.isError) {
            return UserfriendlyResult.fail(UserfriendlyApplicationError.fromError(tokenResultHolder.result.error));
        }

        const tokenDTO = tokenResultHolder.result.value;
        const tokenContent = this.parseTokenContent(tokenDTO.content);
        if (!tokenContent) {
            const error = AppRuntimeErrors.startup.wrongCode();
            return UserfriendlyResult.fail(error);
        }

        if (tokenContent instanceof TokenContentDeviceSharedSecret) {
            await uiBridge.showDeviceOnboarding(DeviceMapper.toDeviceOnboardingInfoDTO(tokenContent.sharedSecret));
            return UserfriendlyResult.ok(undefined);
        }

        const accountSelectionResult = await this.selectAccount(reference.forIdentityTruncated);
        if (accountSelectionResult.isError) {
            return UserfriendlyResult.fail(accountSelectionResult.error);
        }

        const selectedAccount = accountSelectionResult.value;
        if (!selectedAccount) {
            this.logger.info("User cancelled account selection");
            return UserfriendlyResult.ok(undefined);
        }

        return await this._handleReference(reference, selectedAccount, tokenResultHolder.password);
    }

    private async _handleReference(reference: Reference, account: LocalAccountDTO, existingPassword?: string): Promise<UserfriendlyResult<void>> {
        const services = await this.runtime.getServices(account.id);
        const uiBridge = await this.runtime.uiBridge();

        const result = reference.passwordProtection
            ? (
                  await this._fetchPasswordProtectedItemWithRetry(
                      async (password) => await services.transportServices.account.loadItemFromTruncatedReference({ reference: reference.truncate(), password }),
                      reference.passwordProtection
                  )
              ).result
            : await services.transportServices.account.loadItemFromTruncatedReference({ reference: reference.truncate(), password: existingPassword });

        if (result.isError && result.error.code === "error.appStringProcessor.passwordNotProvided") {
            return UserfriendlyResult.ok(undefined);
        }

        if (result.isError) {
            return UserfriendlyResult.fail(UserfriendlyApplicationError.fromError(result.error));
        }

        switch (result.value.type) {
            case "File":
                const file = await services.dataViewExpander.expandFileDTO(result.value.value);
                await uiBridge.showFile(account, file);
                break;
            case "RelationshipTemplate":
                // RelationshipTemplates are processed by the RequestModule
                break;
            case "Token":
                return UserfriendlyResult.fail(
                    new UserfriendlyApplicationError("error.appStringProcessor.notSupportedTokenContent", "The scanned code is not supported in this context")
                );
            case "DeviceOnboardingInfo":
                return UserfriendlyResult.fail(
                    new UserfriendlyApplicationError(
                        "error.appStringProcessor.deviceOnboardingNotAllowed",
                        "The token contained a device onboarding info, but this is not allowed in this context."
                    )
                );
        }

        return UserfriendlyResult.ok(undefined);
    }

    private parseTokenContent(content: any) {
        try {
            return Serializable.fromUnknown(content);
        } catch (e) {
            this.logger.info("Could not parse token content", e);
            return undefined;
        }
    }

    private async _fetchPasswordProtectedItemWithRetry<T>(
        fetchFunction: (password: string) => Promise<Result<T>>,
        passwordProtection: SharedPasswordProtection
    ): Promise<{ result: Result<T>; password?: string }> {
        let attempt = 1;

        const uiBridge = await this.runtime.uiBridge();

        const maxRetries = 1000;
        while (attempt <= maxRetries) {
            const passwordResult = await uiBridge.enterPassword(
                passwordProtection.passwordType === "pw" ? "pw" : "pin",
                passwordProtection.passwordType.startsWith("pin") ? parseInt(passwordProtection.passwordType.substring(3)) : undefined,
                attempt,
                passwordProtection.passwordLocationIndicator
                    ? passwordProtection.mapPasswordLocationIndicatorMediumToNumber(passwordProtection.passwordLocationIndicator)
                    : undefined
            );
            if (passwordResult.isError) {
                return { result: UserfriendlyResult.fail(new UserfriendlyApplicationError("error.appStringProcessor.passwordNotProvided", "No password was provided.")) };
            }

            const password = passwordResult.value;

            const result = await fetchFunction(password);
            attempt++;

            if (result.isSuccess) return { result, password };
            if (result.isError && result.error.code === "error.runtime.recordNotFound") continue;
            return { result };
        }

        return {
            result: UserfriendlyResult.fail(
                new UserfriendlyApplicationError("error.appStringProcessor.passwordRetryLimitReached", "The maximum number of attempts to enter the password was reached.")
            )
        };
    }

    private async selectAccount(forIdentityTruncated?: string): Promise<UserfriendlyResult<LocalAccountDTO | undefined>> {
        const accounts = await this.runtime.accountServices.getAccounts();

        const title = "i18n://uibridge.accountSelection.title";
        const description = "i18n://uibridge.accountSelection.description";
        if (!forIdentityTruncated) return await this.requestManualAccountSelection(accounts, title, description);

        const accountsWithPostfix = accounts.filter((account) => account.address?.endsWith(forIdentityTruncated));
        if (accountsWithPostfix.length === 0) return UserfriendlyResult.fail(AppRuntimeErrors.general.noAccountAvailableForIdentityTruncated());
        if (accountsWithPostfix.length === 1) return UserfriendlyResult.ok(accountsWithPostfix[0]);

        // This catches the extremely rare case where two accounts are available that have the same last 4 characters in their address. In that case
        // the user will have to decide which account to use, which could not work because it is not the exactly same address specified when personalizing the object.
        return await this.requestManualAccountSelection(accountsWithPostfix, title, description);
    }

    private async requestManualAccountSelection(accounts: LocalAccountDTO[], title: string, description: string): Promise<UserfriendlyResult<LocalAccountDTO | undefined>> {
        const uiBridge = await this.runtime.uiBridge();
        const accountSelectionResult = await uiBridge.requestAccountSelection(accounts, title, description);
        if (accountSelectionResult.isError) {
            return UserfriendlyResult.fail(AppRuntimeErrors.general.noAccountAvailable(accountSelectionResult.error));
        }

        if (accountSelectionResult.value) await this.runtime.selectAccount(accountSelectionResult.value.id);
        return UserfriendlyResult.ok(accountSelectionResult.value);
    }
}
