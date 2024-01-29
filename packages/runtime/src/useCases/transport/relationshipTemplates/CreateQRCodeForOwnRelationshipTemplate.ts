import { Result } from "@js-soft/ts-utils";
import { CoreId, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { QRCode, RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateQRCodeForOwnTemplateRequest {
    templateId: RelationshipTemplateIdString;
}

class Validator extends SchemaValidator<CreateQRCodeForOwnTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateQRCodeForOwnTemplateRequest"));
    }
}

export interface CreateQRCodeForOwnTemplateResponse {
    qrCodeBytes: string;
}

export class CreateQRCodeForOwnTemplateUseCase extends UseCase<CreateQRCodeForOwnTemplateRequest, CreateQRCodeForOwnTemplateResponse> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateQRCodeForOwnTemplateRequest): Promise<Result<CreateQRCodeForOwnTemplateResponse>> {
        const template = await this.templateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        if (!template.isOwn) {
            return Result.fail(RuntimeErrors.relationshipTemplates.cannotCreateQRCodeForPeerTemplate());
        }

        const qrCode = await QRCode.forTruncateable(template);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
