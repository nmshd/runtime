import { Result } from "@js-soft/ts-utils";
import { AccountController, DevicesController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface CreateDeviceRequest {
    name?: string;
    description?: string;
    isAdmin?: boolean;
}

class Validator extends SchemaValidator<CreateDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateDeviceRequest"));
    }
}

export class CreateDeviceUseCase extends UseCase<CreateDeviceRequest, DeviceDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateDeviceRequest): Promise<Result<DeviceDTO>> {
        const device = await this.devicesController.sendDevice(request);
        await this.accountController.syncDatawallet();

        return Result.ok(DeviceMapper.toDeviceDTO(device, false));
    }
}
