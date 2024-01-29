import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreDate, CoreId, RelationshipTemplate, RelationshipTemplateController, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import { ISO8601DateTimeString, RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface CreateTokenForOwnTemplateRequest {
    templateId: RelationshipTemplateIdString;
    expiresAt?: ISO8601DateTimeString;
    ephemeral?: boolean;
}

class Validator extends SchemaValidator<CreateTokenForOwnTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenForOwnTemplateRequest"));
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

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey
        });

        const ephemeral = request.ephemeral ?? true;
        const defaultTokenExpiry = template.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral
        });

        if (!ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(token, ephemeral));
    }
}
