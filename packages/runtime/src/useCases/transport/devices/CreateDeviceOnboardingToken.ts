import { Result } from "@js-soft/ts-utils";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { DevicesController, PasswordProtectionCreationParameters, TokenContentDeviceSharedSecret, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import {
    convertPasswordProtection,
    DeviceIdString,
    ISO8601DateTimeString,
    PasswordLocationIndicator,
    SchemaRepository,
    TokenAndTemplateCreationValidator,
    UseCase
} from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface SchemaValidatableCreateDeviceOnboardingTokenRequest {
    id: DeviceIdString;
    expiresAt?: ISO8601DateTimeString;
    profileName?: string;
    passwordProtection?: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: unknown;
    };
}

export type CreateDeviceOnboardingTokenRequest = SchemaValidatableCreateDeviceOnboardingTokenRequest & {
    passwordProtection?: { passwordLocationIndicator?: PasswordLocationIndicator };
};

class Validator extends TokenAndTemplateCreationValidator<CreateDeviceOnboardingTokenRequest> {
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
        const sharedSecret = await this.devicesController.getSharedSecret(CoreId.from(request.id), request.profileName);
        const tokenContent = TokenContentDeviceSharedSecret.from({ sharedSecret });

        const expiresAt = request.expiresAt ? CoreDate.from(request.expiresAt) : CoreDate.utc().add({ minutes: 5 });

        const passwordProtection = request.passwordProtection ? convertPasswordProtection(request.passwordProtection) : undefined;

        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: expiresAt,
            ephemeral: true,
            passwordProtection: PasswordProtectionCreationParameters.create(passwordProtection)
        });

        return Result.ok(TokenMapper.toTokenDTO(token, true));
    }
}
