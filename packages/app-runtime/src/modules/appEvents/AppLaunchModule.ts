import { AppRuntimeError } from "../../AppRuntimeError";
import { UrlOpenEvent } from "../../natives";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface AppLaunchModuleConfig extends AppRuntimeModuleConfiguration {}

export class AppLaunchModuleError extends AppRuntimeError {}

export class AppLaunchModule extends AppRuntimeModule<AppLaunchModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToNativeEvent(UrlOpenEvent, this.handleUrlOpen.bind(this));
    }

    private async handleUrlOpen(event: UrlOpenEvent) {
        const result = await this.runtime.stringProcessor.processURL(event.url);
        if (result.isSuccess) return;

        const promiseOrUiBridge = this.runtime.uiBridge();
        const uiBridge = promiseOrUiBridge instanceof Promise ? await promiseOrUiBridge : promiseOrUiBridge;

        await uiBridge.showError(result.error);
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
