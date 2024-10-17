import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { EventBus, Result } from "@js-soft/ts-utils";
import { ICoreAddress } from "@nmshd/core-types";
import { AnonymousServices, Base64ForIdPrefix, DeviceMapper } from "@nmshd/runtime";
import { Reference, TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { AppRuntimeErrors } from "./AppRuntimeErrors";
import { AppRuntimeServices } from "./AppRuntimeServices";
import { IUIBridge } from "./extensibility";
import { LocalAccountDTO } from "./multiAccount";
import { UserfriendlyApplicationError } from "./UserfriendlyApplicationError";
import { UserfriendlyResult } from "./UserfriendlyResult";

export class AppStringProcessor {
    private readonly logger: ILogger;

    public constructor(
        protected readonly runtime: {
            get anonymousServices(): AnonymousServices;
            requestAccountSelection(title?: string, description?: string, forIdentityTruncated?: string): Promise<UserfriendlyResult<LocalAccountDTO | undefined>>;
            uiBridge(): Promise<IUIBridge>;
            getServices(accountReference: string | ICoreAddress): Promise<AppRuntimeServices>;
            translate(key: string, ...values: any[]): Promise<Result<string>>;
            get eventBus(): EventBus;
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
        if (account) return await this._handleTruncatedReference(truncatedReference, account);

        const reference = Reference.fromTruncated(truncatedReference);

        // process Files and RelationshipTemplates and ask for an account
        if (truncatedReference.startsWith(Base64ForIdPrefix.File) || truncatedReference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            const result = await this.runtime.requestAccountSelection(undefined, undefined, reference.forIdentityTruncated);
            if (result.isError) {
                this.logger.error("Could not query account", result.error);
                return UserfriendlyResult.fail(result.error);
            }

            if (!result.value) {
                this.logger.info("User cancelled account selection");
                return UserfriendlyResult.ok(undefined);
            }

            return await this._handleTruncatedReference(truncatedReference, result.value);
        }

        if (!truncatedReference.startsWith(Base64ForIdPrefix.Token)) {
            const error = AppRuntimeErrors.startup.wrongCode();
            return UserfriendlyResult.fail(error);
        }

        const tokenResult = await this.runtime.anonymousServices.tokens.loadPeerToken({ reference: truncatedReference });
        if (tokenResult.isError) {
            return UserfriendlyResult.fail(UserfriendlyApplicationError.fromError(tokenResult.error));
        }

        const tokenDTO = tokenResult.value;
        const tokenContent = this.parseTokenContent(tokenDTO.content);
        if (!tokenContent) {
            const error = AppRuntimeErrors.startup.wrongCode();
            return UserfriendlyResult.fail(error);
        }

        if (tokenContent instanceof TokenContentDeviceSharedSecret) {
            const uiBridge = await this.runtime.uiBridge();
            await uiBridge.showDeviceOnboarding(DeviceMapper.toDeviceOnboardingInfoDTO(tokenContent.sharedSecret));
            return UserfriendlyResult.ok(undefined);
        }

        const accountSelectionResult = await this.runtime.requestAccountSelection();
        if (accountSelectionResult.isError) {
            return UserfriendlyResult.fail(accountSelectionResult.error);
        }

        const selectedAccount = accountSelectionResult.value;
        if (!selectedAccount) {
            this.logger.info("User cancelled account selection");
            return UserfriendlyResult.ok(undefined);
        }

        return await this._handleTruncatedReference(truncatedReference, selectedAccount);
    }

    private async _handleTruncatedReference(truncatedReference: string, account: LocalAccountDTO): Promise<UserfriendlyResult<void>> {
        const services = await this.runtime.getServices(account.id);
        const uiBridge = await this.runtime.uiBridge();

        const result = await services.transportServices.account.loadItemFromTruncatedReference({ reference: truncatedReference });
        if (result.isError) {
            if (result.error.code === "error.runtime.validation.invalidPropertyValue") {
                return UserfriendlyResult.fail(
                    new UserfriendlyApplicationError("error.appStringProcessor.truncatedReferenceInvalid", "The given code does not contain a valid truncated reference.")
                );
            }

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
}
