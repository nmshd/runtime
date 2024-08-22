import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { EventBus } from "@js-soft/ts-utils";
import { INativeConfigAccess } from "./INativeConfigAccess";
import { INativeDeviceInfoAccess } from "./INativeDeviceInfoAccess";
import { INativeNotificationAccess } from "./INativeNotificationAccess";

export interface INativeEnvironment {
    databaseFactory: ILokiJsDatabaseFactory;
    configAccess: INativeConfigAccess;
    loggerFactory: ILoggerFactory;
    notificationAccess: INativeNotificationAccess;
    eventBus: EventBus;
    deviceInfoAccess: INativeDeviceInfoAccess;
}
