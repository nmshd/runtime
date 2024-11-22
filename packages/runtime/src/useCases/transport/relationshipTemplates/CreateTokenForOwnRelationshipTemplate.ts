import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import {
    AccountController,
    PasswordProtectionCreationParameters,
    RelationshipTemplate,
    RelationshipTemplateController,
    SharedPasswordProtection,
    TokenContentRelationshipTemplate,
    TokenController
} from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { TokenDTO } from "../../../types";
import {
    AddressString,
    ISO8601DateTimeString,
    RelationshipTemplateIdString,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    UseCase,
    ValidationFailure,
    ValidationResult
} from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface CreateTokenForOwnTemplateRequest {
    templateId: RelationshipTemplateIdString;
    expiresAt?: ISO8601DateTimeString;
    ephemeral?: boolean;
    forIdentity?: AddressString;
    passwordProtection?: { password: string; passwordIsPin?: true };
}

class Validator extends SchemaValidator<CreateTokenForOwnTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenForOwnTemplateRequest"));
    }

    public override validate(input: CreateTokenForOwnTemplateRequest): ValidationResult {
        const validationResult = super.validate(input);
        if (!validationResult.isValid()) return validationResult;

        if (input.expiresAt && DateTime.fromISO(input.expiresAt) <= DateTime.utc()) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(`'${nameof<CreateTokenForOwnTemplateRequest>((r) => r.expiresAt)}' must be in the future`),
                    nameof<CreateTokenForOwnTemplateRequest>((r) => r.expiresAt)
                )
            );
        }

        if (input.passwordProtection?.passwordIsPin) {
            if (!/^[0-9]{4,16}$/.test(input.passwordProtection.password)) {
                validationResult.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPin()));
            }
        }

        return validationResult;
    }
}

export class CreateTokenForOwnTemplateUseCase extends UseCase<CreateTokenForOwnTemplateRequest, TokenDTO> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenForOwnTemplateRequest): Promise<Result<TokenDTO>> {
        const template = await this.templateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        if (!template.isOwn) {
            return Result.fail(RuntimeErrors.relationshipTemplates.cannotCreateTokenForPeerTemplate());
        }

        if (template.cache?.forIdentity && request.forIdentity !== template.cache.forIdentity.toString()) {
            return Result.fail(RuntimeErrors.relationshipTemplates.personalizationMustBeInherited());
        }

        if (template.passwordProtection && request.passwordProtection !== template.passwordProtection) {
            return Result.fail(RuntimeErrors.relationshipTemplates.passwordProtectionMustBeInherited());
        }

        const templatePasswordProtection = template.passwordProtection ? SharedPasswordProtection.from(template.passwordProtection) : undefined;

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey,
            forIdentity: template.cache?.forIdentity,
            passwordProtection: templatePasswordProtection
        });

        const ephemeral = request.ephemeral ?? true;
        const defaultTokenExpiry = template.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: PasswordProtectionCreationParameters.create(request.passwordProtection)
        });

        if (!ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(token, ephemeral));
    }
}
