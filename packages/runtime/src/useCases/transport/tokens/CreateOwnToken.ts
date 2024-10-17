import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import { AccountController, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { TokenDTO } from "../../../types";
import { AddressString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface CreateOwnTokenRequest {
    content: any;
    expiresAt: ISO8601DateTimeString;
    ephemeral: boolean;
    forIdentity?: AddressString;
    password?: string;
}

class Validator extends SchemaValidator<CreateOwnTokenRequest> {
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

        if (input.password && /^\d+$/.test(input.password) && (input.password.length > 12 || input.password.length < 2)) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(
                        `Your chosen '${nameof<CreateOwnTokenRequest>((r) => r.password)}' is a PIN (consists of numbers only) and PINs must be at least 2 and at most 12 digits long`
                    ),
                    nameof<CreateOwnTokenRequest>((r) => r.password)
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
            password: request.password
        });

        if (!request.ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(response, request.ephemeral));
    }
}
