import { Result } from "@js-soft/ts-utils";
import { DeviceController, DevicesController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceDTO } from "../../../types";
import { UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export class GetDevicesUseCase extends UseCase<void, DeviceDTO[]> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly deviceController: DeviceController
    ) {
        super();
    }

    protected async executeInternal(): Promise<Result<DeviceDTO[]>> {
        const devices = await this.devicesController.list();
        const currentDevice = this.deviceController.device;

        const deviceDTOs = devices.map((device) => DeviceMapper.toDeviceDTO(device, device.id.equals(currentDevice.id)));

        return Result.ok(deviceDTOs);
    }
}
