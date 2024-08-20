import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import { INativeConfigAccess } from "./INativeConfigAccess";
import { INativeDeviceInfoAccess } from "./INativeDeviceInfoAccess";
import { INativeEventBus } from "./INativeEventBus";
import { INativeLoggerFactory } from "./INativeLoggerFactory";
import { INativeNotificationAccess } from "./INativeNotificationAccess";

export interface INativeEnvironment {
    databaseFactory: ILokiJsDatabaseFactory;
    configAccess: INativeConfigAccess;
    loggerFactory: INativeLoggerFactory;
    notificationAccess: INativeNotificationAccess;
    eventBus: INativeEventBus;
    deviceInfoAccess: INativeDeviceInfoAccess;
}
