import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackbonePostDevicesRequest, BackbonePostDevicesResponse } from "./BackbonePostDevices";
import { BackboneUpdateDeviceRequest } from "./BackboneUpdateDevice";

export class DeviceClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createDevice(value: BackbonePostDevicesRequest): Promise<ClientResult<BackbonePostDevicesResponse>> {
        return await this.post<BackbonePostDevicesResponse>("/api/v1/Devices", value, {});
    }

    public async updateCurrentDevice(value: BackboneUpdateDeviceRequest): Promise<ClientResult<void>> {
        return await this.put<void>("/api/v1/Devices/Self", value);
    }
}
