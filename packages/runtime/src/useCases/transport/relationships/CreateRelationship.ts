import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { RelationshipDTO } from "@nmshd/runtime-types";
import { AccountController, RelationshipTemplate, RelationshipTemplateController, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { RelationshipMapper } from "./RelationshipMapper.js";
import { validateCreationContentOfRelationship } from "./utility/validateCreationContentOfRelationship.js";

export interface CreateRelationshipRequest {
    templateId: RelationshipTemplateIdString;
    creationContent: any;
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
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
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

        const canSendRelationshipResult = await this.relationshipsController.canSendRelationship({ creationContent: request.creationContent, template });
        if (!canSendRelationshipResult.isSuccess) throw canSendRelationshipResult.error;

        const creationContentOfRelationshipValidationError = await validateCreationContentOfRelationship(this.incomingRequestsController, template, request.creationContent);
        if (creationContentOfRelationshipValidationError) return Result.fail(creationContentOfRelationshipValidationError);

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);

        const sendRelationshipResult = await this.relationshipsController.sendRelationship({ template, creationContent: transformedCreationContent.toJSON() });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(sendRelationshipResult));
    }
}
