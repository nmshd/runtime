import { Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, DevicesController, TokenContentDeviceSharedSecret, TokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface FillDeviceOnboardingTokenWithNewDeviceRequest {
    reference: TokenReferenceString;
    profileName?: string;
    isAdmin?: boolean;
}

class Validator extends SchemaValidator<FillDeviceOnboardingTokenWithNewDeviceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("FillDeviceOnboardingTokenWithNewDeviceRequest"));
    }
}

export class FillDeviceOnboardingTokenWithNewDeviceUseCase extends UseCase<FillDeviceOnboardingTokenWithNewDeviceRequest, TokenDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: FillDeviceOnboardingTokenWithNewDeviceRequest): Promise<Result<TokenDTO>> {
        const device = await this.devicesController.sendDevice({ isAdmin: request.isAdmin });
        await this.accountController.syncDatawallet();

        const sharedSecret = await this.devicesController.getSharedSecret(device.id, request.profileName);
        const tokenContent = TokenContentDeviceSharedSecret.from({ sharedSecret });

        const reference = TokenReference.fromTruncated(request.reference);

        const passwordProtection = reference.passwordProtection;
        if (!passwordProtection?.password) throw RuntimeErrors.devices.referenceNotPointingToAnEmptyToken();

        const response = await this.tokenController.updateTokenContent({
            id: reference.id,
            content: tokenContent,
            secretKey: reference.key,
            passwordProtection: reference.passwordProtection!
        });

        return Result.ok(TokenMapper.toTokenDTO(response, true));
    }
}
