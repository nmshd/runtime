import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, PasswordLocationIndicator } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import {
    AddressString,
    ISO8601DateTimeString,
    PasswordProtectionMapper,
    RuntimeErrors,
    SchemaRepository,
    TokenAndTemplateCreationValidator,
    UseCase,
    ValidationFailure,
    ValidationResult
} from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface SchemaValidatableCreateOwnTokenRequest {
    content: any;
    expiresAt: ISO8601DateTimeString;
    ephemeral: boolean;
    forIdentity?: AddressString;
    passwordProtection?: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: unknown;
    };
}

export type CreateOwnTokenRequest = SchemaValidatableCreateOwnTokenRequest & {
    passwordProtection?: { passwordLocationIndicator?: PasswordLocationIndicator };
};

class Validator extends TokenAndTemplateCreationValidator<CreateOwnTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateOwnTokenRequest"));
    }

    public override validate(input: CreateOwnTokenRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (DateTime.fromISO(input.expiresAt) <= DateTime.utc()) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<CreateOwnTokenRequest>((r) => r.expiresAt)}' must be in the future`),
                    nameof<CreateOwnTokenRequest>((r) => r.expiresAt)
                )
            );
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
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionCreationParameters(request.passwordProtection)
        });

        if (!request.ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(response, request.ephemeral));
    }
}
