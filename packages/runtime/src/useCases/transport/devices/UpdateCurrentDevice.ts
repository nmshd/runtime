import { Result } from "@js-soft/ts-utils";
import { DeviceDTO } from "@nmshd/runtime-types";
import { AccountController, DeviceController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface UpdateCurrentDeviceRequest {
    name?: string;
    description?: string;
}

class Validator extends SchemaValidator<UpdateCurrentDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpdateCurrentDeviceRequest"));
    }
}

export class UpdateCurrentDeviceUseCase extends UseCase<UpdateCurrentDeviceRequest, DeviceDTO> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject private readonly deviceController: DeviceController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpdateCurrentDeviceRequest): Promise<Result<DeviceDTO>> {
        await this.deviceController.update(request);
        await this.accountController.syncDatawallet();

        return Result.ok(DeviceMapper.toDeviceDTO(this.deviceController.device, true));
    }
}
