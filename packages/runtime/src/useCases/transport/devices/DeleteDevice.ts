import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { AccountController, Device, DevicesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { DeviceIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";

export interface DeleteDeviceRequest {
    id: DeviceIdString;
}

class Validator extends SchemaValidator<DeleteDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteDeviceRequest"));
    }
}

export class DeleteDeviceUseCase extends UseCase<DeleteDeviceRequest, void> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteDeviceRequest): Promise<Result<void>> {
        // syncing the datawallet before deleting the device is important,
        // because we want to make sure to validate locally that the device is not onboarded yet
        await this.accountController.syncDatawallet();

        const device = await this.devicesController.get(CoreId.from(request.id));
        if (!device) return Result.fail(RuntimeErrors.general.recordNotFound(Device));

        await this.devicesController.delete(device);
        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
