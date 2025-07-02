import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { DeviceOnboardingInfoDTO } from "@nmshd/runtime-types";
import { DevicesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { GenericIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { DeviceMapper } from "./DeviceMapper";

export interface GetDeviceOnboardingInfoRequest {
    id: GenericIdString;
    profileName?: string;
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
        const onboardingInfo = await this.devicesController.getSharedSecret(CoreId.from(request.id), request.profileName);

        return Result.ok(DeviceMapper.toDeviceOnboardingInfoDTO(onboardingInfo));
    }
}
