import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { validateCreationContentOfRelationship } from "./utility/validateCreationContentOfRelationship";

export interface CanCreateRelationshipRequest {
    templateId: RelationshipTemplateIdString;
    creationContent?: any;
}

class Validator extends SchemaValidator<CanCreateRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CanCreateRelationshipRequest"));
    }
}

export type CanCreateRelationshipResponse =
    | { isSuccess: true }
    | {
          isSuccess: false;
          code: string;
          message: string;
      };

export class CanCreateRelationshipUseCase extends UseCase<CanCreateRelationshipRequest, CanCreateRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CanCreateRelationshipRequest): Promise<Result<CanCreateRelationshipResponse>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));
        if (!template) {
            const error = RuntimeErrors.general.recordNotFound(RelationshipTemplate);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        const canSendRelationshipResult = await this.relationshipsController.canSendRelationship({ creationContent: request.creationContent, template });
        if (canSendRelationshipResult.isError) return Result.ok({ isSuccess: false, code: canSendRelationshipResult.error.code, message: canSendRelationshipResult.error.reason });

        if (request.creationContent) {
            const creationContentOfRelationshipValidationError = await validateCreationContentOfRelationship(this.incomingRequestsController, template, request.creationContent);
            if (creationContentOfRelationshipValidationError) {
                return Result.ok({
                    isSuccess: false,
                    code: creationContentOfRelationshipValidationError.code,
                    message: creationContentOfRelationshipValidationError.message
                });
            }
        }

        return Result.ok({ isSuccess: true });
    }
}
