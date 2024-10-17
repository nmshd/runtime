import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, Relationship, RelationshipTemplate, RelationshipTemplateController, RelationshipsController } from "@nmshd/transport";
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

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
                )
            );
        }

        let sendRelationshipResult: Relationship;
        try {
            sendRelationshipResult = await this.relationshipsController.sendRelationship({ template, creationContent: transformedCreationContent.toJSON() });
        } catch (error) {
            if (
                error instanceof ApplicationError &&
                error.code === "error.transport.relationships.relationshipTemplateIsExpired" &&
                template.cache?.content instanceof RelationshipTemplateContent &&
                template.cache.expiresAt
            ) {
                const dbQuery: any = {};
                dbQuery["source.reference"] = { $eq: template.id.toString() };
                await this.incomingRequestsController.getIncomingRequestsWithUpdatedExpiry(dbQuery);
            }
            throw error;
        }

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(sendRelationshipResult));
    }
}
