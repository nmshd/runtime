import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, ArbitraryRelationshipTemplateContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

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

        const canSendRelationship = await this.relationshipsController.canSendRelationship({ creationContent: request.creationContent, template });
        if (canSendRelationship.isError) return Result.ok({ isSuccess: false, code: canSendRelationship.error.code, message: canSendRelationship.error.reason });

        if (request.creationContent) {
            const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
            if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
                const error = RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
                );
                return Result.ok({ isSuccess: false, code: error.code, message: error.message });
            }

            const transformedTemplateContent = template.cache.content;
            if (transformedCreationContent instanceof ArbitraryRelationshipCreationContent && !(transformedTemplateContent instanceof ArbitraryRelationshipTemplateContent)) {
                const error = RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the Relationship is an ArbitraryRelationshipTemplateContent."
                );
                return Result.ok({ isSuccess: false, code: error.code, message: error.message });
            }

            if (transformedCreationContent instanceof RelationshipCreationContent) {
                if (!(transformedTemplateContent instanceof RelationshipTemplateContent)) {
                    const error = RuntimeErrors.general.invalidPropertyValue(
                        "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the Relationship is a RelationshipTemplateContent."
                    );
                    return Result.ok({ isSuccess: false, code: error.code, message: error.message });
                }

                const relationshipCreationContentValidationError = await this.validateRelationshipCreationContent(request.templateId, transformedCreationContent);
                if (relationshipCreationContentValidationError) {
                    return Result.ok({ isSuccess: false, code: relationshipCreationContentValidationError.code, message: relationshipCreationContentValidationError.message });
                }
            }
        }

        return Result.ok({ isSuccess: true });
    }

    private async validateRelationshipCreationContent(templateId: RelationshipTemplateIdString, relationshipCreationContent: RelationshipCreationContent) {
        const acceptedIncomingRequests = await this.incomingRequestsController.getIncomingRequests({
            query: {
                source: { reference: templateId },
                status: [LocalRequestStatus.Decided],
                response: { content: { result: "Accepted" } }
            }
        });

        if (acceptedIncomingRequests.length === 0) {
            return RuntimeErrors.general.unknown("There is no accepted incoming Request associated with the RelationshipTemplate.");
        }

        if (JSON.stringify(acceptedIncomingRequests[0].response!.content) !== JSON.stringify(relationshipCreationContent.response)) {
            return RuntimeErrors.general.unknown("The Response of the accepted incoming Request must be provided as the response of the RelationshipCreationContent.");
        }

        return;
    }
}
