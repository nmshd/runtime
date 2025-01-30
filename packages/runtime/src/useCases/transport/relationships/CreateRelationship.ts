import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, ArbitraryRelationshipTemplateContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, RelationshipTemplateController, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

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

        const canSendRelationship = await this.relationshipsController.canSendRelationship({ creationContent: request.creationContent, template });
        if (!canSendRelationship.isSuccess) throw canSendRelationship.error;

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
                )
            );
        }

        const transformedTemplateContent = template.cache?.content;
        if (transformedTemplateContent instanceof ArbitraryRelationshipTemplateContent && !(transformedCreationContent instanceof ArbitraryRelationshipCreationContent)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must be an ArbitraryRelationshipCreationContent if the content of the RelationshipTemplate is an ArbitraryRelationshipTemplateContent."
                )
            );
        }

        if (transformedTemplateContent instanceof RelationshipTemplateContent) {
            if (!(transformedCreationContent instanceof RelationshipCreationContent)) {
                return Result.fail(
                    RuntimeErrors.general.invalidPropertyValue(
                        "The creationContent of a Relationship must be a RelationshipCreationContent if the content of the RelationshipTemplate is a RelationshipTemplateContent."
                    )
                );
            }

            const relationshipCreationContentValidationError = await this.validateRelationshipCreationContent(request.templateId, transformedCreationContent);
            if (relationshipCreationContentValidationError) return Result.fail(relationshipCreationContentValidationError);
        }

        const sendRelationshipResult = await this.relationshipsController.sendRelationship({ template, creationContent: transformedCreationContent.toJSON() });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(sendRelationshipResult));
    }

    private async validateRelationshipCreationContent(templateId: RelationshipTemplateIdString, relationshipCreationContent: RelationshipCreationContent) {
        const acceptedIncomingRequests = await this.incomingRequestsController.getIncomingRequests({
            status: LocalRequestStatus.Decided,
            "source.reference": templateId,
            "response.content.result": "Accepted"
        });

        if (acceptedIncomingRequests.length === 0) {
            return RuntimeErrors.relationships.noAcceptedIncomingRequest();
        }

        if (JSON.stringify(acceptedIncomingRequests[0].response!.content) !== JSON.stringify(relationshipCreationContent.response)) {
            return RuntimeErrors.relationships.wrongResponseProvidedAsCreationContent();
        }

        return;
    }
}
