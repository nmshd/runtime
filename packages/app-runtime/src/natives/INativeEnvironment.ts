import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { INativeConfigAccess } from "./INativeConfigAccess";
import { INativeNotificationAccess } from "./INativeNotificationAccess";

export interface INativeEnvironment {
    databaseFactory: ILokiJsDatabaseFactory;
    configAccess: INativeConfigAccess;
    loggerFactory: ILoggerFactory;
    notificationAccess: INativeNotificationAccess;
}
