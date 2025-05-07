import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, PasswordLocationIndicator, SharedPasswordProtection } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, RelationshipTemplateController, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import {
    AddressString,
    ISO8601DateTimeString,
    PasswordProtectionMapper,
    RelationshipTemplateIdString,
    RuntimeErrors,
    SchemaRepository,
    TokenAndTemplateCreationValidator,
    UseCase
} from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface SchemaValidatableCreateTokenForOwnRelationshipTemplateRequest {
    templateId: RelationshipTemplateIdString;
    expiresAt?: ISO8601DateTimeString;
    ephemeral?: boolean;
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

export type CreateTokenForOwnRelationshipTemplateRequest = SchemaValidatableCreateTokenForOwnRelationshipTemplateRequest & {
    passwordProtection?: { passwordLocationIndicator?: PasswordLocationIndicator };
};

class Validator extends TokenAndTemplateCreationValidator<CreateTokenForOwnRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenForOwnRelationshipTemplateRequest"));
    }
}

export class CreateTokenForOwnRelationshipTemplateUseCase extends UseCase<CreateTokenForOwnRelationshipTemplateRequest, TokenDTO> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,

        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenForOwnRelationshipTemplateRequest): Promise<Result<TokenDTO>> {
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

        const passwordProtectionCreationParameters = PasswordProtectionMapper.toPasswordProtectionCreationParameters(request.passwordProtection);

        if (template.passwordProtection && !template.passwordProtection.matchesPasswordProtectionParameters(passwordProtectionCreationParameters)) {
            return Result.fail(RuntimeErrors.relationshipTemplates.passwordProtectionMustBeInherited());
        }

        const passwordProtection = template.passwordProtection ? SharedPasswordProtection.from(template.passwordProtection) : undefined;

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey,
            forIdentity: template.cache?.forIdentity,
            passwordProtection
        });

        const defaultTokenExpiry = template.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;

        const ephemeral = request.ephemeral ?? true;

        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: passwordProtectionCreationParameters
        });

        if (!ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(token, ephemeral));
    }
}
