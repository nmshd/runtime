import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, Device, DeviceController, DevicesController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceDTO } from "../../../types";
import { DeviceIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface UpdateDeviceRequest {
    id: DeviceIdString;
    name?: string;
    description?: string;
}

class Validator extends SchemaValidator<UpdateDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpdateDeviceRequest"));
    }
}

export class UpdateDeviceUseCase extends UseCase<UpdateDeviceRequest, DeviceDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly deviceController: DeviceController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpdateDeviceRequest): Promise<Result<DeviceDTO>> {
        const device = await this.devicesController.get(CoreId.from(request.id));

        if (!device) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Device));
        }

        if (typeof request.name !== "undefined") {
            device.name = request.name;
        }

        device.description = request.description;

        await this.devicesController.update(device);
        await this.accountController.syncDatawallet();

        const currentDevice = this.deviceController.device;
        const isCurrentDevice = device.id.equals(currentDevice.id);
        return Result.ok(DeviceMapper.toDeviceDTO(device, isCurrentDevice));
    }
}
