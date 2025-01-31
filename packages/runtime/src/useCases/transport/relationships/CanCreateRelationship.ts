import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { RelationshipCreationContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { validateTypeOfCreationContentOfRelationship } from "./utility/validateTypeOfCreationContentOfRelationship";

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

        if (!template.cache) {
            const error = RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString());
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        const canSendRelationshipResult = await this.relationshipsController.canSendRelationship({ creationContent: request.creationContent, template });
        if (canSendRelationshipResult.isError) return Result.ok({ isSuccess: false, code: canSendRelationshipResult.error.code, message: canSendRelationshipResult.error.reason });

        if (request.creationContent) {
            const typeOfCreationContentOfRelationshipValidationError = validateTypeOfCreationContentOfRelationship(template, request.creationContent);
            if (typeOfCreationContentOfRelationshipValidationError) {
                return Result.ok({
                    isSuccess: false,
                    code: typeOfCreationContentOfRelationshipValidationError.code,
                    message: typeOfCreationContentOfRelationshipValidationError.message
                });
            }

            const transformedCreationContent = Serializable.fromUnknown(request.creationContent);

            if (transformedCreationContent instanceof RelationshipCreationContent) {
                const responseToRequestOfTemplateValidationError = await this.validateResponseToRequestOfTemplate(request.templateId, transformedCreationContent);
                if (responseToRequestOfTemplateValidationError) {
                    return Result.ok({ isSuccess: false, code: responseToRequestOfTemplateValidationError.code, message: responseToRequestOfTemplateValidationError.message });
                }
            }
        }

        return Result.ok({ isSuccess: true });
    }

    private async validateResponseToRequestOfTemplate(
        templateId: RelationshipTemplateIdString,
        relationshipCreationContent: RelationshipCreationContent
    ): Promise<ApplicationError | undefined> {
        const acceptedIncomingRequests = await this.incomingRequestsController.getIncomingRequests({
            status: LocalRequestStatus.Decided,
            "source.reference": templateId,
            "response.content.result": "Accepted"
        });

        if (acceptedIncomingRequests.length === 0) {
            return RuntimeErrors.relationships.noAcceptedIncomingRequest();
        }

        if (acceptedIncomingRequests[0].response!.content.serialize() !== relationshipCreationContent.response.serialize()) {
            return RuntimeErrors.relationships.wrongResponseProvidedAsCreationContent();
        }

        return;
    }
}
