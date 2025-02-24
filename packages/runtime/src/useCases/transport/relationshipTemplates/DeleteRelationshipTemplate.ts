import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteRelationshipTemplateRequest {
    templateId: RelationshipTemplateIdString;
}

class Validator extends SchemaValidator<DeleteRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteRelationshipTemplateRequest"));
    }
}

export class DeleteRelationshipTemplateUseCase extends UseCase<DeleteRelationshipTemplateRequest, void> {
    public constructor(
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteRelationshipTemplateRequest): Promise<Result<void>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));
        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        await this.relationshipTemplateController.deleteRelationshipTemplate(template);

        return Result.ok(undefined);
    }
}
