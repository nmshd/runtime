import { RESTClientAuthenticate, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackboneGetDevicesResponse } from "./BackboneGetDevices";
import { BackbonePostDevicesRequest, BackbonePostDevicesResponse } from "./BackbonePostDevices";
import { BackboneUpdateDeviceRequest } from "./BackboneUpdateDevice";

export interface BackbonePutDevicesPasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface BackbonePutDevicesPushNotificationRequest {
    platform: string;
    handle: string;
    appId: string;
    environment?: "Development" | "Production";
}

export interface BackbonePutDevicesPushNotificationResponse {
    devicePushIdentifier: string;
}

export class DeviceAuthClient extends RESTClientAuthenticate {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async changeDevicePassword(input: BackbonePutDevicesPasswordRequest): Promise<ClientResult<void>> {
        return await this.put<void>("/api/v2/Devices/Self/Password", input);
    }

    public async createDevice(value: BackbonePostDevicesRequest): Promise<ClientResult<BackbonePostDevicesResponse>> {
        return await this.post<BackbonePostDevicesResponse>("/api/v2/Devices", value);
    }

    public async deleteDevice(deviceId: string): Promise<ClientResult<void>> {
        return await this.delete<void>(`/api/v2/Devices/${deviceId}`);
    }

    public async registerPushNotificationToken(input: BackbonePutDevicesPushNotificationRequest): Promise<ClientResult<BackbonePutDevicesPushNotificationResponse>> {
        return await this.put<BackbonePutDevicesPushNotificationResponse>("/api/v2/Devices/Self/PushNotifications", input);
    }

    public async unregisterPushNotificationToken(): Promise<ClientResult<void>> {
        return await this.delete<void>("/api/v2/Devices/Self/PushNotifications");
    }

    public async updateCurrentDevice(value: BackboneUpdateDeviceRequest): Promise<ClientResult<void>> {
        return await this.put<void>("/api/v2/Devices/Self", value);
    }

    public async getCurrentDevice(): Promise<ClientResult<BackboneGetDevicesResponse>> {
        return await this.get<BackboneGetDevicesResponse>("/api/v2/Devices/Self");
    }
}
