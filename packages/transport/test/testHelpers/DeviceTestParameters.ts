import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ILoggerFactory } from "@js-soft/logging-abstractions";
import { IConfigOverwrite } from "@nmshd/transport";

enum DeviceControllerType {
    MultiAccountController = "MultiAccountController",
    SingleAccountController = "SingleAccountController"
}

export class DeviceTestParameters {
    public config: IConfigOverwrite;
    public connection: IDatabaseConnection;
    public loggerFactory: ILoggerFactory;
    public controllerType: DeviceControllerType;

    public constructor(
        config: IConfigOverwrite,
        connection: IDatabaseConnection,
        loggerFactory: ILoggerFactory,
        controllerType: DeviceControllerType = DeviceControllerType.MultiAccountController
    ) {
        this.config = config;
        this.connection = connection;
        this.loggerFactory = loggerFactory;
        this.controllerType = controllerType;
    }
}
