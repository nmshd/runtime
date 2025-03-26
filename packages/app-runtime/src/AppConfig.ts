import { RuntimeConfig } from "@nmshd/runtime";
import { IConfigOverwrite } from "@nmshd/transport";
import { defaultsDeep } from "lodash";

export interface AppConfig extends RuntimeConfig {
    accountsDbName: string;
    applicationId: string;
    pushService: "apns" | "fcm" | "none" | "dummy";
    applePushEnvironment?: "Development" | "Production";
    allowMultipleAccountsWithSameAddress: boolean;
    databaseFolder: string;
}

export interface AppConfigOverwrite {
    transportLibrary?: Omit<IConfigOverwrite, "supportedIdentityVersion">;
    accountsDbName?: string;
    applicationId?: string;
    pushService?: "apns" | "fcm" | "none" | "dummy";
    applePushEnvironment?: "Development" | "Production";
    allowMultipleAccountsWithSameAddress?: boolean;
    databaseFolder?: string;
    modules?: Record<string, { enabled?: boolean; [x: string | number | symbol]: unknown }>;
}

export function createAppConfig(...configs: (AppConfigOverwrite | AppConfig)[]): AppConfig {
    const appConfig: Omit<AppConfig, "transportLibrary" | "applicationId"> & {
        transportLibrary: Omit<IConfigOverwrite, "supportedIdentityVersion" | "platformClientId" | "platformClientSecret" | "baseUrl">;
    } = {
        accountsDbName: "accounts",
        pushService: "none",
        allowMultipleAccountsWithSameAddress: false,
        databaseFolder: "./data",
        transportLibrary: {
            datawalletEnabled: true
        },
        modules: {
            pushNotification: {
                location: "pushNotification",
                enabled: true
            },
            mailReceived: {
                location: "mailReceived",
                enabled: true
            },
            onboardingChangeReceived: {
                location: "onboardingChangeReceived",
                enabled: true
            },
            identityDeletionProcessStatusChanged: {
                location: "identityDeletionProcessStatusChanged",
                enabled: true
            },
            messageReceived: {
                location: "messageReceived",
                enabled: true
            },
            relationshipChanged: {
                location: "relationshipChanged",
                enabled: true
            },
            relationshipTemplateProcessed: {
                location: "relationshipTemplateProcessed",
                enabled: true
            },
            sse: {
                location: "sse",
                enabled: false
            },
            decider: {
                location: "@nmshd/runtime:DeciderModule",
                enabled: true
            },
            request: {
                enabled: true,
                location: "@nmshd/runtime:RequestModule"
            },
            attributeListener: {
                enabled: true,
                location: "@nmshd/runtime:AttributeListenerModule"
            },
            notification: {
                enabled: true,
                location: "@nmshd/runtime:NotificationModule"
            }
        }
    };

    const mergedConfig = defaultsDeep({}, ...configs, appConfig);

    return mergedConfig;
}
