import { EventEmitter2EventBus, Result } from "@js-soft/ts-utils";
import { WebLoggerFactory } from "@js-soft/web-logger";
import { INativeBootstrapper, INativeEnvironment } from "../../src";
import { NativeConfigAccessMock } from "../mocks/NativeConfigAccessMock";
import { NativeDatabaseFactoryMock } from "../mocks/NativeDatabaseFactoryMock";
import { NativeDeviceInfoAccessMock } from "../mocks/NativeDeviceInfoAccessMock";
import { NativeNotificationAccessMock } from "../mocks/NativeNotificationAccessMock";

export class NativeBootstrapperMock implements INativeBootstrapper {
    private _nativeEnvironment: INativeEnvironment;
    public get nativeEnvironment(): INativeEnvironment {
        return this._nativeEnvironment;
    }

    public get isInitialized(): boolean {
        return true;
    }

    public async init(): Promise<Result<void>> {
        const loggerFactory = new WebLoggerFactory();
        const nativeLogger = loggerFactory.getLogger("NativeMocks");

        this._nativeEnvironment = {
            configAccess: new NativeConfigAccessMock(),
            databaseFactory: new NativeDatabaseFactoryMock(),
            deviceInfoAccess: new NativeDeviceInfoAccessMock(),
            eventBus: new EventEmitter2EventBus(() => {
                // noop
            }),
            loggerFactory,
            notificationAccess: new NativeNotificationAccessMock(nativeLogger)
        };

        await this._nativeEnvironment.deviceInfoAccess.init();
        await this._nativeEnvironment.notificationAccess.init();

        return Result.ok(undefined);
    }
}
