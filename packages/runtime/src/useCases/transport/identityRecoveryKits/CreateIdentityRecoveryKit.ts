import { Result } from "@js-soft/ts-utils";
import { CoreDate, PasswordLocationIndicatorOptions } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, Device, DevicesController, PasswordProtectionCreationParameters, TokenContentDeviceSharedSecret, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, TokenAndTemplateCreationValidator, UseCase } from "../../common/index.js";
import { TokenMapper } from "../tokens/TokenMapper.js";

export interface CreateIdentityRecoveryKitRequest {
    profileName: string;
    passwordProtection: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
    };
}

class Validator extends TokenAndTemplateCreationValidator<CreateIdentityRecoveryKitRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateIdentityRecoveryKitRequest"));
    }
}

export class CreateIdentityRecoveryKitUseCase extends UseCase<CreateIdentityRecoveryKitRequest, TokenDTO> {
    public constructor(
        @Inject private readonly devicesController: DevicesController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateIdentityRecoveryKitRequest): Promise<Result<TokenDTO>> {
        if (!this.accountController.config.datawalletEnabled) return Result.fail(RuntimeErrors.identityRecoveryKits.datawalletDisabled());

        const devices = await this.devicesController.list();

        const backupDevices = devices.filter((device) => device.isBackupDevice);
        if (backupDevices.length > 0) await this.removeBackupDevices(backupDevices);

        const newBackupDevice = await this.devicesController.sendDevice({ isAdmin: true, isBackupDevice: true, name: "Backup Device" });
        const sharedSecret = await this.devicesController.getSharedSecret(newBackupDevice.id, request.profileName);

        const token = await this.tokenController.sendToken({
            content: TokenContentDeviceSharedSecret.from({ sharedSecret }),
            expiresAt: CoreDate.from("9999-12-31"),
            ephemeral: false,
            passwordProtection: PasswordProtectionCreationParameters.create({
                ...request.passwordProtection,
                passwordLocationIndicator: PasswordLocationIndicatorOptions.RecoveryKit
            })
        });

        await this.accountController.syncDatawallet();

        return Result.ok(TokenMapper.toTokenDTO(token, false));
    }

    private async removeBackupDevices(backupDevices: Device[]) {
        for (const backupDevice of backupDevices) {
            const matchingTokens = await this.tokenController.getTokens({
                "content.@type": "TokenContentDeviceSharedSecret",
                "content.sharedSecret.id": backupDevice.id.toString()
            });

            for (const matchingToken of matchingTokens) {
                await this.tokenController.delete(matchingToken);
            }

            await this.devicesController.delete(backupDevice);
        }
    }
}
