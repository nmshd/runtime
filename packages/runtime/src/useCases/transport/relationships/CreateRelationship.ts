import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { RelationshipCreationContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, RelationshipTemplateController, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { RelationshipTemplateIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";
import { validateTypeOfCreationContentOfRelationship } from "./utility/validateTypeOfCreationContentOfRelationship";

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

        const typeOfCreationContentOfRelationshipValidationError = validateTypeOfCreationContentOfRelationship(template, request.creationContent);
        if (typeOfCreationContentOfRelationshipValidationError) return Result.fail(typeOfCreationContentOfRelationshipValidationError);

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);

        if (transformedCreationContent instanceof RelationshipCreationContent) {
            const responseToRequestOfTemplateValidationError = await this.validateResponseToRequestOfTemplate(request.templateId, transformedCreationContent);
            if (responseToRequestOfTemplateValidationError) return Result.fail(responseToRequestOfTemplateValidationError);
        }

        const sendRelationshipResult = await this.relationshipsController.sendRelationship({ template, creationContent: transformedCreationContent.toJSON() });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(sendRelationshipResult));
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
