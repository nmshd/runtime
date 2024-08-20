import { Result } from "@js-soft/ts-utils";
import { INativeBootstrapper, INativeEnvironment } from "../../src";
import { NativeConfigAccessMock } from "../mocks/NativeConfigAccessMock";
import { NativeDatabaseFactoryMock } from "../mocks/NativeDatabaseFactoryMock";
import { NativeDeviceInfoAccessMock } from "../mocks/NativeDeviceInfoAccessMock";
import { NativeEventBusMock } from "../mocks/NativeEventBusMock";
import { NativeLoggerFactoryMock } from "../mocks/NativeLoggerFactoryMock";
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
        const nativeLoggerFactory = new NativeLoggerFactoryMock();
        const nativeLogger = nativeLoggerFactory.getLogger("NativeMocks");
        this._nativeEnvironment = {
            configAccess: new NativeConfigAccessMock(),
            databaseFactory: new NativeDatabaseFactoryMock(),
            deviceInfoAccess: new NativeDeviceInfoAccessMock(),
            eventBus: new NativeEventBusMock(),
            loggerFactory: nativeLoggerFactory,
            notificationAccess: new NativeNotificationAccessMock(nativeLogger)
        };
        await this._nativeEnvironment.eventBus.init();
        await this._nativeEnvironment.deviceInfoAccess.init();
        await this._nativeEnvironment.loggerFactory.init();
        await this._nativeEnvironment.notificationAccess.init();

        return Result.ok(undefined);
    }
}
