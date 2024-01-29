import { Result } from "@js-soft/ts-utils";
import { CoreId, Device, DeviceController, DevicesController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceDTO } from "../../../types";
import { DeviceIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface GetDeviceRequest {
    id: DeviceIdString;
}

class Validator extends SchemaValidator<GetDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetDeviceRequest"));
    }
}

export class GetDeviceUseCase extends UseCase<GetDeviceRequest, DeviceDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly deviceController: DeviceController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetDeviceRequest): Promise<Result<DeviceDTO>> {
        const device = await this.devicesController.get(CoreId.from(request.id));

        if (!device) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Device));
        }

        const currentDevice = this.deviceController.device;
        const isCurrentDevice = device.id.equals(currentDevice.id);

        return Result.ok(DeviceMapper.toDeviceDTO(device, isCurrentDevice));
    }
}
