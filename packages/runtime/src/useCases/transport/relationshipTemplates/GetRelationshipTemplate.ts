import { Result } from "@js-soft/ts-utils";
import { CoreId, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateDTO } from "../../../types";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface GetRelationshipTemplateRequest {
    id: RelationshipTemplateIdString;
}

class Validator extends SchemaValidator<GetRelationshipTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRelationshipTemplateRequest"));
    }
}

export class GetRelationshipTemplateUseCase extends UseCase<GetRelationshipTemplateRequest, RelationshipTemplateDTO> {
    public constructor(
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.id));
        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTO(template));
    }
}
