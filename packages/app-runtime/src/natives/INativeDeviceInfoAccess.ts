import { Result } from "@js-soft/ts-utils";

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
    pushService: "apns" | "fcm" | "none" | "dummy";
}
