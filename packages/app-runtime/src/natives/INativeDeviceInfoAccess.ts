import { Result } from "@js-soft/ts-utils";

export enum PushServices {
    "apns" = "apns", // eslint-disable-line @typescript-eslint/naming-convention
    "fcm" = "fcm", // eslint-disable-line @typescript-eslint/naming-convention
    "none" = "none" // eslint-disable-line @typescript-eslint/naming-convention
}

export interface INativeDeviceInfoAccess {
    init(): Promise<Result<INativeDeviceInfo>>;
    deviceInfo: INativeDeviceInfo;
}

export interface INativeDeviceInfo {
    model: string;
    platform: string;
    uuid: string;
    version: string;
    manufacturer: string;
    isVirtual: boolean;
    languageCode: string;
    pushService: PushServices;
}
