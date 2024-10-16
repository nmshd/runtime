import { EventEmitter2EventBus, Result } from "@js-soft/ts-utils";
import { WebLoggerFactory } from "@js-soft/web-logger";
import { INativeBootstrapper, INativeEnvironment } from "../../../src";
import { FakeNativeConfigAccess } from "./FakeNativeConfigAccess";
import { FakeNativeDatabaseFactory } from "./FakeNativeDatabaseFactory";
import { FakeNativeDeviceInfoAccess } from "./FakeNativeDeviceInfoAccess";
import { FakeNativeNotificationAccess } from "./FakeNativeNotificationAccess";

export class FakeNativeBootstrapper implements INativeBootstrapper {
    private _nativeEnvironment: INativeEnvironment;
    public get nativeEnvironment(): INativeEnvironment {
        return this._nativeEnvironment;
    }

    public get isInitialized(): boolean {
        return true;
    }

    public async init(): Promise<Result<void>> {
        const loggerFactory = new WebLoggerFactory();
        const nativeLogger = loggerFactory.getLogger("FakeNatives");

        this._nativeEnvironment = {
            configAccess: new FakeNativeConfigAccess(),
            databaseFactory: new FakeNativeDatabaseFactory(),
            deviceInfoAccess: new FakeNativeDeviceInfoAccess(),
            eventBus: new EventEmitter2EventBus(() => {
                // noop
            }),
            loggerFactory,
            notificationAccess: new FakeNativeNotificationAccess(nativeLogger)
        };

        await this._nativeEnvironment.deviceInfoAccess.init();
        await this._nativeEnvironment.notificationAccess.init();

        return Result.ok(undefined);
    }
}
