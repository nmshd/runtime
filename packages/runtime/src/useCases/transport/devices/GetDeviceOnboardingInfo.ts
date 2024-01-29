import { Result } from "@js-soft/ts-utils";
import { CoreId, DevicesController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceOnboardingInfoDTO } from "../../../types";
import { GenericIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface GetDeviceOnboardingInfoRequest {
    id: GenericIdString;
}

class Validator extends SchemaValidator<GetDeviceOnboardingInfoRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetDeviceOnboardingInfoRequest"));
    }
}

export class GetDeviceOnboardingInfoUseCase extends UseCase<GetDeviceOnboardingInfoRequest, DeviceOnboardingInfoDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetDeviceOnboardingInfoRequest): Promise<Result<DeviceOnboardingInfoDTO>> {
        const onboardingInfo = await this.devicesController.getSharedSecret(CoreId.from(request.id));

        return Result.ok(DeviceMapper.toDeviceOnboardingInfoDTO(onboardingInfo));
    }
}
