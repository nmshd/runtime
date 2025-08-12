import { sleep } from "@js-soft/ts-utils";
import { RuntimeServices, SyncEverythingResponse } from "@nmshd/runtime";
import { AppRuntimeErrors } from "../AppRuntimeErrors";
import { AccountSelectedEvent, ExternalEventReceivedEvent, RemoteNotificationEvent, RemoteNotificationRegistrationEvent } from "../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "./AppRuntimeModule";

enum BackboneEventName {
    DatawalletModificationsCreated = "DatawalletModificationsCreated",
    ExternalEventCreated = "ExternalEventCreated"
}

interface IBackboneEventContent {
    devicePushIdentifier: string;
    eventName: BackboneEventName;
    sentAt: string;
    payload: any;
}

export interface PushNotificationModuleConfig extends AppRuntimeModuleConfiguration {}

export class PushNotificationModule extends AppRuntimeModule<PushNotificationModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(RemoteNotificationEvent, this.handleRemoteNotification.bind(this));
        this.subscribeToEvent(RemoteNotificationRegistrationEvent, this.handleTokenRegistration.bind(this));
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
                    const result = await this.syncEverythingUntilHasChanges(services);

                    if (result) {
                        this.runtime.eventBus.publish(new ExternalEventReceivedEvent(accRef, result));
                    }

                    break;
                default:
                    break;
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async syncEverythingUntilHasChanges(services: RuntimeServices): Promise<SyncEverythingResponse | undefined> {
        const hasChanges = (value: SyncEverythingResponse): boolean =>
            Object.values(value)
                .filter((v) => Array.isArray(v))
                .some((array) => array.length > 0);

        const syncResult = await services.transportServices.account.syncEverything();

        if (syncResult.isError) {
            this.logger.error(syncResult.error);
        } else if (hasChanges(syncResult.value)) {
            return syncResult.value;
        }

        let retries = 0;
        const maxRetries = 5;

        while (retries <= maxRetries) {
            retries++;
            await sleep(250 * Math.ceil(retries / 2));

            const syncResult = await services.transportServices.account.syncEverything();
            if (syncResult.isError) {
                this.logger.error(syncResult.error);
                continue;
            }

            if (hasChanges(syncResult.value)) return syncResult.value;

            this.logger.info(`No changes found in sync attempt ${retries + 1}. Retrying...`);
        }

        return;
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
        const tokenResult = await this.runtime.notificationAccess.getPushToken();
        if (tokenResult.isError) {
            this.logger.error(tokenResult.error);
            return;
        }

        await this.registerPushTokenForLocalAccount(event.data.address, tokenResult.value);
    }

    private async registerPushTokenForLocalAccount(address: string, token: string): Promise<void> {
        if (!token) {
            this.logger.info("The registered token was empty. This might be the case if you did not allow push notifications.");
            return;
        }

        const services = await this.runtime.getServices(address);

        const deviceResult = await services.transportServices.account.getDeviceInfo();
        if (deviceResult.isError) {
            this.logger.error(deviceResult.error);

            const error = AppRuntimeErrors.modules.pushNotificationModule.tokenRegistrationNotPossible("No device for this account found", deviceResult.error);
            this.logger.error(error);

            throw error;
        }

        const appId = this.runtime.config.applicationId;
        const handle = token;
        const platform = this.runtime.config.pushService;
        const environment = this.runtime.config.applePushEnvironment;

        if (platform === "none") return;

        const result = await services.transportServices.account.registerPushNotificationToken({
            platform,
            handle,
            appId,
            environment: environment
        });

        if (result.isError) {
            this.logger.error(result.error);

            const error = AppRuntimeErrors.modules.pushNotificationModule.tokenRegistrationNotPossible(result.error.message, result.error);
            this.logger.error(error);

            throw error;
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
}
