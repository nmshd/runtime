import { LanguageISO639 } from "@nmshd/core-types";
import { AccountSelectedEvent, AppLanguageChangedEvent } from "../events/index.js";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "./AppRuntimeModule.js";

export interface AppLanguageModuleConfig extends AppRuntimeModuleConfiguration {}

export class AppLanguageModule extends AppRuntimeModule<AppLanguageModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(AppLanguageChangedEvent, this.handleAppLanguageChanged.bind(this));
        this.subscribeToEvent(AccountSelectedEvent, this.handleAccountSelected.bind(this));
    }

    private async handleAppLanguageChanged(event: AppLanguageChangedEvent) {
        try {
            this.logger.trace("AppLanguageModule.handleAppLanguageChanged", event);

            for (const session of this.runtime.getSessions()) {
                await this.updateLanguageForLocalAccount(session.account.address!, event.language);
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async handleAccountSelected(event: AccountSelectedEvent) {
        this.logger.trace("AppLanguageModule.handleAccountSelected", event);
        const languageResult = await this.runtime.appLanguageProvider.getAppLanguage();
        if (languageResult.isError) {
            this.logger.error(languageResult.error);
            return;
        }

        await this.updateLanguageForLocalAccount(event.data.address, languageResult.value);
    }

    private async updateLanguageForLocalAccount(address: string, language: keyof typeof LanguageISO639): Promise<void> {
        const services = await this.runtime.getServices(address);

        const result = await services.transportServices.devices.setCommunicationLanguage({
            communicationLanguage: language
        });

        if (result.isError) {
            this.logger.error(`Could not update the communication language for account '${address}' to '${language}': ${result.error}`);
            return;
        }

        this.logger.info(`Updated communication language for account '${address}' to '${language}'`);
    }
}
