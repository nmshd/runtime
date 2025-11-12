import { Result } from "@js-soft/ts-utils";
import { DeviceDTO } from "@nmshd/runtime-types";
import { DeviceController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { DeviceMapper } from "../devices/DeviceMapper.js";

export class GetDeviceInfoUseCase extends UseCase<void, DeviceDTO> {
    public constructor(@Inject private readonly deviceController: DeviceController) {
        super();
    }

    protected executeInternal(): Result<DeviceDTO> {
        const device = this.deviceController.device;
        return Result.ok(DeviceMapper.toDeviceDTO(device, true));
    }
}
