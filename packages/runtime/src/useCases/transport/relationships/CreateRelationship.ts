import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, RelationshipTemplate, RelationshipTemplateController, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestStatus, RelationshipDTO } from "../../../types";
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

        if (template.isExpired()) {
            if (template.cache?.content instanceof RelationshipTemplateContent) {
                const dbQuery: any = {};
                dbQuery["source.reference"] = { $eq: template.id.toString() };
                dbQuery["status"] = { $neq: LocalRequestStatus.Completed };
                const nonCompletedRequestsFromTemplate = await this.incomingRequestsController.getIncomingRequests(dbQuery);

                if (nonCompletedRequestsFromTemplate.length !== 0 && template.cache.expiresAt) {
                    const promises = nonCompletedRequestsFromTemplate.map((localRequest) =>
                        this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache!.expiresAt!)
                    );
                    await Promise.all(promises);
                }
            }

            return Result.fail(
                RuntimeErrors.relationships.expiredRelationshipTemplate(
                    `The RelationshipTemplate '${template.id.toString()}' has already expired and therefore cannot be used to create a Relationship.`
                )
            );
        }

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
                )
            );
        }

        const relationship = await this.relationshipsController.sendRelationship({ template, creationContent: transformedCreationContent.toJSON() });

        await this.accountController.syncDatawallet();

        return Result.ok(RelationshipMapper.toRelationshipDTO(relationship));
    }
}
