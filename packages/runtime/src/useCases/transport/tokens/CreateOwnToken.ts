import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { AccountController, PasswordProtectionCreationParameters, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import { AddressString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface CreateOwnTokenRequest {
    content: any;
    expiresAt: ISO8601DateTimeString;
    ephemeral: boolean;
    forIdentity?: AddressString;
    passwordProtection?: { password: string; passwordIsPin?: true };
}

class Validator extends SchemaValidator<CreateOwnTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateOwnTokenRequest"));
    }

    public override validate(input: CreateOwnTokenRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (input.passwordProtection?.passwordIsPin) {
            if (!/^[0-9]{4,16}$/.test(input.passwordProtection.password)) {
                validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPin()));
            }
        }

        return validationResult;
    }
}

export class CreateOwnTokenUseCase extends UseCase<CreateOwnTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateOwnTokenRequest): Promise<Result<TokenDTO>> {
        let tokenContent;
        try {
            tokenContent = Serializable.fromUnknown(request.content);
        } catch {
            throw RuntimeErrors.general.invalidTokenContent();
        }

        const response = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: CoreDate.from(request.expiresAt),
            ephemeral: request.ephemeral,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: PasswordProtectionCreationParameters.create(request.passwordProtection)
        });

        if (!request.ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(response, request.ephemeral));
    }
}
