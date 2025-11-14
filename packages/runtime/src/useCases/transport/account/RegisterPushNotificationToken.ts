import { Result } from "@js-soft/ts-utils";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";

export interface RegisterPushNotificationTokenRequest {
    handle: string;
    platform: string;
    appId: string;
    environment?: "Development" | "Production";
}

export interface RegisterPushNotificationTokenResponse {
    devicePushIdentifier: string;
}

class Validator extends SchemaValidator<RegisterPushNotificationTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RegisterPushNotificationTokenRequest"));
    }
}

export class RegisterPushNotificationTokenUseCase extends UseCase<RegisterPushNotificationTokenRequest, RegisterPushNotificationTokenResponse> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RegisterPushNotificationTokenRequest): Promise<Result<RegisterPushNotificationTokenResponse>> {
        const result = await this.accountController.registerPushNotificationToken({
            handle: request.handle,
            platform: request.platform,
            appId: request.appId,
            environment: request.environment
        });

        return Result.ok({ devicePushIdentifier: result.devicePushIdentifier });
    }
}
