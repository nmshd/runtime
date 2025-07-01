import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { EventBus, Result } from "@js-soft/ts-utils";
import { ICoreAddress, Reference, SharedPasswordProtection } from "@nmshd/core-types";
import { AnonymousServices, DeviceMapper, RuntimeServices } from "@nmshd/runtime";
import { BackboneIds, TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { AppRuntimeErrors } from "./AppRuntimeErrors";
import { IUIBridge } from "./extensibility";
import { AccountServices, LocalAccountDTO, LocalAccountSession } from "./multiAccount";

export class AppStringProcessor {
    private readonly logger: ILogger;

    public constructor(
        protected readonly runtime: {
            get anonymousServices(): AnonymousServices;
            get accountServices(): AccountServices;
            uiBridge(): Promise<IUIBridge> | IUIBridge;
            getServices(accountReference: string | ICoreAddress): Promise<RuntimeServices>;
            get eventBus(): EventBus;
            selectAccount(accountReference: string): Promise<LocalAccountSession>;
        },
        loggerFactory: ILoggerFactory
    ) {
        this.logger = loggerFactory.getLogger(this.constructor);
    }

    public async processURL(url: string, account?: LocalAccountDTO): Promise<Result<void>> {
        url = url.trim();

        const parsed = new URL(url);
        const allowedProtocols = ["http:", "https:", "nmshd:"];
        if (!allowedProtocols.includes(parsed.protocol)) return Result.fail(AppRuntimeErrors.appStringProcessor.wrongURL());

        return await this.processReference(url, account);
    }

    public async processReference(referenceString: string, account?: LocalAccountDTO): Promise<Result<void>> {
        try {
            const reference = Reference.from(referenceString);
            return await this._processReference(reference, account);
        } catch (_) {
            return Result.fail(AppRuntimeErrors.appStringProcessor.invalidReference());
        }
    }

    private async _processReference(reference: Reference, account?: LocalAccountDTO): Promise<Result<void>> {
        if (account) return await this._handleReference(reference, account);

        // process Files and RelationshipTemplates and ask for an account
        if (BackboneIds.file.validate(reference.id) || BackboneIds.relationshipTemplate.validate(reference.id)) {
            const result = await this.selectAccount(reference.forIdentityTruncated);
            if (result.isError) {
                this.logger.info("Could not query account", result.error);
                return Result.fail(result.error);
            }

            if (!result.value) {
                this.logger.info("User cancelled account selection");
                return Result.ok(undefined);
            }

            return await this._handleReference(reference, result.value);
        }

        if (!BackboneIds.token.validate(reference.id)) {
            const error = AppRuntimeErrors.appStringProcessor.wrongCode();
            return Result.fail(error);
        }

        const tokenResultHolder = reference.passwordProtection
            ? await this._fetchPasswordProtectedItemWithRetry(
                  async (password) => await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: reference.truncate(), password }),
                  reference.passwordProtection
              )
            : { result: await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: reference.truncate() }) };

        if (tokenResultHolder.result.isError && tokenResultHolder.result.error.equals(AppRuntimeErrors.appStringProcessor.passwordNotProvided())) {
            return Result.ok(undefined);
        }

        if (tokenResultHolder.result.isError) return Result.fail(tokenResultHolder.result.error);

        const tokenDTO = tokenResultHolder.result.value;
        const tokenContent = this.parseTokenContent(tokenDTO.content);
        if (!tokenContent) {
            const error = AppRuntimeErrors.appStringProcessor.wrongCode();
            return Result.fail(error);
        }

        if (tokenContent instanceof TokenContentDeviceSharedSecret) return Result.fail(AppRuntimeErrors.appStringProcessor.deviceOnboardingNotAllowed());

        const accountSelectionResult = await this.selectAccount(reference.forIdentityTruncated);
        if (accountSelectionResult.isError) {
            return Result.fail(accountSelectionResult.error);
        }

        const selectedAccount = accountSelectionResult.value;
        if (!selectedAccount) {
            this.logger.info("User cancelled account selection");
            return Result.ok(undefined);
        }

        return await this._handleReference(reference, selectedAccount, tokenResultHolder.password);
    }

    private async _handleReference(reference: Reference, account: LocalAccountDTO, existingPassword?: string): Promise<Result<void>> {
        const services = await this.runtime.getServices(account.id);
        const uiBridge = await this.runtime.uiBridge();

        const result = reference.passwordProtection
            ? (
                  await this._fetchPasswordProtectedItemWithRetry(
                      async (password) => await services.transportServices.account.loadItemFromReference({ reference: reference.truncate(), password }),
                      reference.passwordProtection
                  )
              ).result
            : await services.transportServices.account.loadItemFromReference({ reference: reference.truncate(), password: existingPassword });

        if (result.isError && result.error.equals(AppRuntimeErrors.appStringProcessor.passwordNotProvided())) {
            return Result.ok(undefined);
        }

        if (result.isError) {
            return Result.fail(result.error);
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
                return Result.fail(AppRuntimeErrors.appStringProcessor.notSupportedTokenContent());
            case "DeviceOnboardingInfo":
                return Result.fail(AppRuntimeErrors.appStringProcessor.deviceOnboardingNotAllowed());
        }

        return Result.ok(undefined);
    }

    public async processDeviceOnboardingReference(url: string): Promise<Result<void>> {
        url = url.trim();

        let reference: Reference;

        try {
            reference = Reference.from(url);
        } catch (_) {
            return Result.fail(AppRuntimeErrors.appStringProcessor.invalidReference());
        }

        if (!BackboneIds.token.validate(reference.id)) return Result.fail(AppRuntimeErrors.appStringProcessor.noDeviceOnboardingCode());

        const tokenResultHolder = reference.passwordProtection
            ? await this._fetchPasswordProtectedItemWithRetry(
                  async (password) => await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: reference.truncate(), password }),
                  reference.passwordProtection
              )
            : { result: await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: reference.truncate() }) };

        if (tokenResultHolder.result.isError && tokenResultHolder.result.error.equals(AppRuntimeErrors.appStringProcessor.passwordNotProvided())) {
            return Result.ok(undefined);
        }

        if (tokenResultHolder.result.isError) {
            return Result.fail(tokenResultHolder.result.error);
        }

        const tokenDTO = tokenResultHolder.result.value;
        const tokenContent = this.parseTokenContent(tokenDTO.content);
        if (!(tokenContent instanceof TokenContentDeviceSharedSecret)) return Result.fail(AppRuntimeErrors.appStringProcessor.noDeviceOnboardingCode());

        const uiBridge = await this.runtime.uiBridge();
        await uiBridge.showDeviceOnboarding(DeviceMapper.toDeviceOnboardingInfoDTO(tokenContent.sharedSecret));
        return Result.ok(undefined);
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
            );
            if (passwordResult.isError) {
                return { result: Result.fail(AppRuntimeErrors.appStringProcessor.passwordNotProvided()) };
            }

            const password = passwordResult.value;

            const result = await fetchFunction(password);
            attempt++;

            if (result.isSuccess) return { result, password };
            if (result.isError && result.error.code === "error.runtime.recordNotFound") continue;
            return { result };
        }

        return {
            result: Result.fail(AppRuntimeErrors.appStringProcessor.passwordRetryLimitReached())
        };
    }

    private async selectAccount(forIdentityTruncated?: string): Promise<Result<LocalAccountDTO | undefined>> {
        const accounts = await this.runtime.accountServices.getAccountsNotInDeletion();

        const title = "i18n://uibridge.accountSelection.title";
        const description = "i18n://uibridge.accountSelection.description";
        if (!forIdentityTruncated) return await this.requestManualAccountSelection(accounts, title, description);

        const accountsWithPostfix = accounts.filter((account) => account.address?.endsWith(forIdentityTruncated));
        if (accountsWithPostfix.length === 0) return Result.fail(AppRuntimeErrors.general.noAccountAvailableForIdentityTruncated());
        if (accountsWithPostfix.length === 1) return Result.ok(accountsWithPostfix[0]);

        // This catches the extremely rare case where two accounts are available that have the same last 4 characters in their address. In that case
        // the user will have to decide which account to use, which could not work because it is not the exactly same address specified when personalizing the object.
        return await this.requestManualAccountSelection(accountsWithPostfix, title, description);
    }

    private async requestManualAccountSelection(accounts: LocalAccountDTO[], title: string, description: string): Promise<Result<LocalAccountDTO | undefined>> {
        const uiBridge = await this.runtime.uiBridge();
        const accountSelectionResult = await uiBridge.requestAccountSelection(accounts, title, description);
        if (accountSelectionResult.isError) {
            return Result.fail(AppRuntimeErrors.general.noAccountAvailable(accountSelectionResult.error));
        }

        if (accountSelectionResult.value) await this.runtime.selectAccount(accountSelectionResult.value.id);
        return Result.ok(accountSelectionResult.value);
    }
}
