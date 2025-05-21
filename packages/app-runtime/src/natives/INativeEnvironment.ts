import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { INativeNotificationAccess } from "./INativeNotificationAccess";

export interface INativeEnvironment {
    databaseFactory: ILokiJsDatabaseFactory;
    loggerFactory: ILoggerFactory;
    notificationAccess: INativeNotificationAccess;
}
