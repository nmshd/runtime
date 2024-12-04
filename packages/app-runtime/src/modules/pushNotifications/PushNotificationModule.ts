import { Result } from "@js-soft/ts-utils";
import { AppRuntimeErrors } from "../../AppRuntimeErrors";
import { AccountSelectedEvent, ExternalEventReceivedEvent } from "../../events";
import { RemoteNotificationEvent, RemoteNotificationRegistrationEvent } from "../../natives";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";
import { BackboneEventName, IBackboneEventContent } from "./IBackboneEventContent";

export interface PushNotificationModuleConfig extends AppRuntimeModuleConfiguration {}

export class PushNotificationModule extends AppRuntimeModule<PushNotificationModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToNativeEvent(RemoteNotificationEvent, this.handleRemoteNotification.bind(this));
        this.subscribeToNativeEvent(RemoteNotificationRegistrationEvent, this.handleTokenRegistration.bind(this));
        this.subscribeToEvent(AccountSelectedEvent, this.handleAccountSelected.bind(this));
    }

    private async handleRemoteNotification(event: RemoteNotificationEvent) {
        this.logger.trace("PushNotificationModule.handleRemoteNotification", event);
        const notification = event.notification;
        const content = notification.content as IBackboneEventContent;

        const accRef = await this.runtime.multiAccountController.getAccountReferenceForDevicePushIdentifier(content.devicePushIdentifier);

        try {
            const services = await this.runtime.getServices(accRef);

            switch (content.eventName) {
                case BackboneEventName.DatawalletModificationsCreated:
                    const walletResult = await services.transportServices.account.syncDatawallet();
                    if (walletResult.isError) {
                        this.logger.error(walletResult);
                        return;
                    }
                    break;
                case BackboneEventName.ExternalEventCreated:
                    const syncResult = await services.transportServices.account.syncEverything();
                    if (syncResult.isError) {
                        this.logger.error(syncResult);
                        return;
                    }

                    this.runtime.eventBus.publish(new ExternalEventReceivedEvent(accRef, syncResult.value));

                    break;
                default:
                    break;
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async handleTokenRegistration(event: RemoteNotificationRegistrationEvent) {
        try {
            this.logger.trace("PushNotificationModule.handleTokenRegistration", event);

            for (const session of this.runtime.getSessions()) {
                await this.registerPushTokenForLocalAccount(session.account.address!, event.token);
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async handleAccountSelected(event: AccountSelectedEvent) {
        this.logger.trace("PushNotificationModule.handleAccountSelected", event);
        const tokenResult = this.getNotificationTokenFromConfig();
        if (tokenResult.isError) {
            this.logger.error(tokenResult.error);
            return;
        }

        await this.registerPushTokenForLocalAccount(event.data.address, tokenResult.value);
    }

    public async registerPushTokenForLocalAccount(address: string, token: string): Promise<void> {
        if (!token) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .tokenRegistrationNotPossible("The registered token was empty. This might be the case if you did not allow push notifications.")
                .logWith(this.logger);
        }

        const services = await this.runtime.getServices(address);

        const deviceResult = await services.transportServices.account.getDeviceInfo();
        if (deviceResult.isError) {
            this.logger.error(deviceResult.error);
            throw AppRuntimeErrors.modules.pushNotificationModule.tokenRegistrationNotPossible("No device for this account found", deviceResult.error).logWith(this.logger);
        }

        const platform = this.runtime.nativeEnvironment.deviceInfoAccess.deviceInfo.pushService;
        const appId = this.runtime.config.applicationId;
        const handle = token;
        const environment = this.runtime.config.applePushEnvironment;

        const result = await services.transportServices.account.registerPushNotificationToken({
            platform,
            handle,
            appId,
            environment: environment
        });

        if (result.isError) {
            this.logger.error(result.error);
            throw AppRuntimeErrors.modules.pushNotificationModule.tokenRegistrationNotPossible(result.error.message, result.error).logWith(this.logger);
        }

        this.logger.info(
            `PushNotificationModule.registerPushTokenForLocalAccount: Token ${handle} registered for account ${address} on platform ${platform}${
                environment ? ` (${environment})` : ""
            } and appId ${appId}`
        );

        await this.registerPushIdentifierForAccount(address, result.value.devicePushIdentifier);
    }

    private async registerPushIdentifierForAccount(address: string, devicePushIdentifier: string): Promise<void> {
        this.logger.trace("PushNotificationModule.registerPushIdentifierForAccount", { address, pushIdentifier: devicePushIdentifier });

        await this.runtime.multiAccountController.updatePushIdentifierForAccount(address, devicePushIdentifier);
    }

    public getNotificationTokenFromConfig(): Result<string> {
        const pushTokenResult = this.runtime.nativeEnvironment.configAccess.get("pushToken");
        if (pushTokenResult.isError) {
            Result.fail(pushTokenResult.error);
        }
        return Result.ok(pushTokenResult.value);
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
