import { Result } from "@js-soft/ts-utils";
import { CoreDate, CoreId, DevicesController, TokenContentDeviceSharedSecret, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import { DeviceIdString, ISO8601DateTimeString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface CreateDeviceOnboardingTokenRequest {
    id: DeviceIdString;
    expiresAt?: ISO8601DateTimeString;
}

class Validator extends SchemaValidator<CreateDeviceOnboardingTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateDeviceOnboardingTokenRequest"));
    }
}

export class CreateDeviceOnboardingTokenUseCase extends UseCase<CreateDeviceOnboardingTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateDeviceOnboardingTokenRequest): Promise<Result<TokenDTO>> {
        const sharedSecret = await this.devicesController.getSharedSecret(CoreId.from(request.id));
        const expiresAt = request.expiresAt ? CoreDate.from(request.expiresAt) : CoreDate.utc().add({ minutes: 5 });

        const tokenContent = TokenContentDeviceSharedSecret.from({ sharedSecret });
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: expiresAt,
            ephemeral: true
        });

        return Result.ok(TokenMapper.toTokenDTO(token, true));
    }
}
