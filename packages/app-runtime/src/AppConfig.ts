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
        transportLibrary: { datawalletEnabled: true },
        modules: {
            pushNotification: { enabled: true, location: "pushNotification" },
            mailReceived: { enabled: true, location: "mailReceived" },
            onboardingChangeReceived: { enabled: true, location: "onboardingChangeReceived" },
            identityDeletionProcessStatusChanged: { enabled: true, location: "identityDeletionProcessStatusChanged" },
            messageReceived: { enabled: true, location: "messageReceived" },
            relationshipChanged: { enabled: true, location: "relationshipChanged" },
            relationshipTemplateProcessed: { enabled: true, location: "relationshipTemplateProcessed" },
            sse: { enabled: false, location: "sse" },
            decider: { enabled: true, location: "@nmshd/runtime:DeciderModule" },
            request: { enabled: true, location: "@nmshd/runtime:RequestModule" },
            attributeListener: { enabled: true, location: "@nmshd/runtime:AttributeListenerModule" },
            notification: { enabled: true, location: "@nmshd/runtime:NotificationModule" }
        }
    };

    const mergedConfig = defaultsDeep({}, ...configs, appConfig);

    return mergedConfig;
}
