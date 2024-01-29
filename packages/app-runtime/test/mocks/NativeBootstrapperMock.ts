import { INativeBootstrapper, INativeEnvironment, NativePlatform } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";
import { NativeAuthenticationAccessMock } from "../mocks/NativeAuthenticationAccessMock";
import { NativeConfigAccessMock } from "../mocks/NativeConfigAccessMock";
import { NativeDatabaseFactoryMock } from "../mocks/NativeDatabaseFactoryMock";
import { NativeDeviceInfoAccessMock } from "../mocks/NativeDeviceInfoAccessMock";
import { NativeEventBusMock } from "../mocks/NativeEventBusMock";
import { NativeFileAccessMock } from "../mocks/NativeFileAccessMock";
import { NativeKeychainAccessMock } from "../mocks/NativeKeychainAccessMock";
import { NativeLoggerFactoryMock } from "../mocks/NativeLoggerFactoryMock";
import { NativeNotificationAccessMock } from "../mocks/NativeNotificationAccessMock";
import { NativeScannerAccessMock } from "../mocks/NativeScannerAccessMock";
import { NativePushNotificationAccessMock } from "./NativePushNotificationAccessMock";

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
            platform: NativePlatform.Node,
            authenticationAccess: new NativeAuthenticationAccessMock(),
            configAccess: new NativeConfigAccessMock(),
            databaseFactory: new NativeDatabaseFactoryMock(),
            deviceInfoAccess: new NativeDeviceInfoAccessMock(),
            eventBus: new NativeEventBusMock(),
            fileAccess: new NativeFileAccessMock(),
            keychainAccess: new NativeKeychainAccessMock(),
            loggerFactory: nativeLoggerFactory,
            notificationAccess: new NativeNotificationAccessMock(nativeLogger),
            pushNotificationAccess: new NativePushNotificationAccessMock(),
            scannerAccess: new NativeScannerAccessMock()
        };
        await this._nativeEnvironment.eventBus.init();
        await this._nativeEnvironment.deviceInfoAccess.init();
        await this._nativeEnvironment.fileAccess.init();
        await this._nativeEnvironment.keychainAccess.init();
        await this._nativeEnvironment.loggerFactory.init();
        await this._nativeEnvironment.notificationAccess.init();
        await this._nativeEnvironment.pushNotificationAccess.init();

        return Result.ok(undefined);
    }
}
