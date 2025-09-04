import { Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, Device, DevicesController, TokenContentDeviceSharedSecret, TokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, URLTokenReferenceString, UseCase } from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface FillDeviceOnboardingTokenWithNewDeviceRequest {
    reference: TokenReferenceString | URLTokenReferenceString;
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
        const reference = TokenReference.fromTruncated(request.reference);

        const passwordProtection = reference.passwordProtection;
        if (!passwordProtection?.password) throw RuntimeErrors.devices.referenceNotPointingToAnEmptyToken();

        const isEmptyToken = await this.tokenController.isEmptyToken(reference);
        if (!isEmptyToken) throw RuntimeErrors.devices.referenceNotPointingToAnEmptyToken();

        const device = await this.devicesController.sendDevice({ isAdmin: request.isAdmin });
        await this.accountController.syncDatawallet();

        const sharedSecret = await this.devicesController.getSharedSecret(device.id, request.profileName);

        try {
            const response = await this.tokenController.updateTokenContent({
                id: reference.id,
                content: TokenContentDeviceSharedSecret.from({ sharedSecret }),
                secretKey: reference.key,
                passwordProtection: reference.passwordProtection!
            });

            return Result.ok(TokenMapper.toTokenDTO(response, true));
        } catch (e) {
            await this.rollback(device);
            throw e;
        }
    }

    private async rollback(device: Device) {
        await this.devicesController.delete(device);
        await this.accountController.syncDatawallet();
    }
}
