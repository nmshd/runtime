import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { BackbonePostDevicesRequest, BackbonePostDevicesResponse } from "./BackbonePostDevices";

export class DeviceClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createDevice(value: BackbonePostDevicesRequest): Promise<ClientResult<BackbonePostDevicesResponse>> {
        return await this.post<BackbonePostDevicesResponse>("/api/v1/Devices", value, {});
    }
}
