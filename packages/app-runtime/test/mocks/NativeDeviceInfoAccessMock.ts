import { INativeDeviceInfo, INativeDeviceInfoAccess, PushServices } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";

export class NativeDeviceInfoAccessMock implements INativeDeviceInfoAccess {
    public get deviceInfo(): INativeDeviceInfo {
        return {
            uuid: "00000000-7e7a-4e82-bd56-9cdba102ac13",
            model: "Mock-Model",
            isVirtual: true,
            languageCode: "de",
            manufacturer: "Mock-Manufacturer",
            platform: "Mock-Platform",
            version: "Mock-Version",
            pushService: PushServices.fcm
        };
    }

    public init(): Promise<Result<INativeDeviceInfo>> {
        return Promise.resolve(Result.ok(this.deviceInfo));
    }
}
