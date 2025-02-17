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
                name: "pushNotification",
                displayName: "Push Notification Module",
                location: "pushNotification",
                enabled: true
            },
            mailReceived: {
                name: "mailReceived",
                displayName: "Mail Received Module",
                location: "mailReceived",
                enabled: true
            },
            onboardingChangeReceived: {
                name: "onboardingChangeReceived",
                displayName: "Onboarding Change Received Module",
                location: "onboardingChangeReceived",
                enabled: true
            },
            identityDeletionProcessStatusChanged: {
                name: "identityDeletionProcessStatusChanged",
                displayName: "Identity Deletion Process Status Changed Module",
                location: "identityDeletionProcessStatusChanged",
                enabled: true
            },
            messageReceived: {
                name: "messageReceived",
                displayName: "Message Received Module",
                location: "messageReceived",
                enabled: true
            },
            relationshipChanged: {
                name: "relationshipChanged",
                displayName: "Relationship Changed Module",
                location: "relationshipChanged",
                enabled: true
            },
            relationshipTemplateProcessed: {
                name: "relationshipTemplateProcessed",
                displayName: "Relationship Template Processed",
                location: "relationshipTemplateProcessed",
                enabled: true
            },
            sse: {
                name: "SSEModule",
                displayName: "SSE Module",
                location: "sse",
                enabled: false
            },
            decider: {
                displayName: "Decider Module",
                name: "DeciderModule",
                location: "@nmshd/runtime:DeciderModule",
                enabled: true
            },
            request: {
                displayName: "Request Module",
                name: "RequestModule",
                location: "@nmshd/runtime:RequestModule",
                enabled: true
            },
            attributeListener: {
                enabled: true,
                name: "AttributeListenerModule",
                displayName: "Attribute Listener",
                location: "@nmshd/runtime:AttributeListenerModule"
            },
            notification: {
                enabled: true,
                name: "NotificationModule",
                displayName: "Notification Module",
                location: "@nmshd/runtime:NotificationModule"
            }
        }
    };

    const mergedConfig = defaultsDeep({}, ...configs, appConfig);

    return mergedConfig;
}
