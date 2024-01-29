import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import { INativeConfigAccess, INativeDeviceInfoAccess, INativeEventBus, INativeLoggerFactory, INativeNotificationAccess } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export interface RuntimeNativeBootstrapper {
    isInitialized: boolean;
    nativeEnvironment: RuntimeNativeEnvironment;
    init(): Promise<Result<void>>;
}

export interface RuntimeNativeEnvironment {
    databaseFactory: ILokiJsDatabaseFactory;
    configAccess: INativeConfigAccess;
    loggerFactory: INativeLoggerFactory;
    notificationAccess: INativeNotificationAccess;
    eventBus: INativeEventBus;
    deviceInfoAccess: INativeDeviceInfoAccess;
}
