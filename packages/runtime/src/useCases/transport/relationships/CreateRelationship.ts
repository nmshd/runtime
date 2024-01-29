import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface CreateRelationshipRequest {
    templateId: RelationshipTemplateIdString;
    content: any;
}

class Validator extends SchemaValidator<CreateRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateRelationshipRequest"));
    }
}

export class CreateRelationshipUseCase extends UseCase<CreateRelationshipRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateRelationshipRequest): Promise<Result<RelationshipDTO>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));
        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        const relationship = await this.relationshipsController.sendRelationship({
            template: template,
            content: request.content
        });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(relationship));
    }
}
