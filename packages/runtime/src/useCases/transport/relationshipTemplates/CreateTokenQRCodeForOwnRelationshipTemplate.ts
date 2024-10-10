import { Result } from "@js-soft/ts-utils";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { RelationshipTemplate, RelationshipTemplateController, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { ISO8601DateTimeString, QRCode, RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateTokenQRCodeForOwnTemplateRequest {
    templateId: RelationshipTemplateIdString;
    expiresAt?: ISO8601DateTimeString;
}

class Validator extends SchemaValidator<CreateTokenQRCodeForOwnTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenQRCodeForOwnTemplateRequest"));
    }
}

export interface CreateTokenQRCodeForOwnTemplateResponse {
    qrCodeBytes: string;
}

export class CreateTokenQRCodeForOwnTemplateUseCase extends UseCase<CreateTokenQRCodeForOwnTemplateRequest, CreateTokenQRCodeForOwnTemplateResponse> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenQRCodeForOwnTemplateRequest): Promise<Result<CreateTokenQRCodeForOwnTemplateResponse>> {
        const template = await this.templateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        if (!template.isOwn) {
            return Result.fail(RuntimeErrors.relationshipTemplates.cannotCreateTokenForPeerTemplate());
        }

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey,
            forIdentity: template.cache!.forIdentity
        });

        const defaultTokenExpiry = template.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral: true,
            forIdentity: template.cache?.forIdentity
        });

        const qrCode = await QRCode.forTruncateable(token);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
