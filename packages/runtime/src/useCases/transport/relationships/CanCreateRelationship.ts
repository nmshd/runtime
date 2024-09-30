import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { CreateRelationshipRequest } from "./CreateRelationship";

export interface CanCreateRelationshipResponse {
    isSuccess: boolean;
    code?: string;
    message?: string;
}

export class CanCreateRelationshipUseCase extends UseCase<CreateRelationshipRequest, CanCreateRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly incomingRequestsController: IncomingRequestsController
    ) {
        super();
    }

    protected async executeInternal(request: CreateRelationshipRequest): Promise<Result<CanCreateRelationshipResponse>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        if (!template.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString()));
        }

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            return Result.fail(
                RuntimeErrors.general.invalidPropertyValue(
                    "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
                )
            );
        }

        const canSendRelationship = await this.relationshipController.canSendRelationship({ creationContent: request.creationContent, template });

        if (!canSendRelationship.isSuccess) {
            if (canSendRelationship.error.code === "error.transport.relationships.relationshipTemplateIsExpired") {
                if (template.cache.content instanceof RelationshipTemplateContent && template.cache.expiresAt) {
                    const dbQuery: any = {};
                    dbQuery["source.reference"] = { $eq: template.id.toString() };
                    await this.incomingRequestsController.getIncomingRequests(dbQuery);
                }
            }

            const errorResponse: CanCreateRelationshipResponse = {
                isSuccess: false,
                code: canSendRelationship.error.code,
                message: canSendRelationship.error.message
            };

            return Result.ok(errorResponse);
        }

        const successResponse: CanCreateRelationshipResponse = { isSuccess: true };
        return Result.ok(successResponse);
    }
}
