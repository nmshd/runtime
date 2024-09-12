import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { RelationshipTemplateContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { CachedRelationshipTemplate, RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { CreateRelationshipRequest } from "./CreateRelationship";

export type CanCreateRelationshipResponse = CanCreateRelationshipSuccessResponse | CanCreateRelationshipErrorResponse;

interface CanCreateRelationshipSuccessResponse {
    isSuccess: true;
}

interface CanCreateRelationshipErrorResponse {
    isSuccess: false;
    error: ApplicationError;
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
            return Result.fail(RuntimeErrors.general.recordNotFound(CachedRelationshipTemplate));
        }

        const existingRelationshipsToPeer = await this.relationshipController.getExistingRelationshipsToIdentity(template.cache.createdBy);

        if (existingRelationshipsToPeer.length !== 0) {
            const errorResponse: CanCreateRelationshipErrorResponse = {
                isSuccess: false,
                error: RuntimeErrors.relationships.relationshipCurrentlyExists(existingRelationshipsToPeer[0].status)
            };

            return Result.ok(errorResponse);
        }

        if (template.isExpired()) {
            if (template.cache.content instanceof RelationshipTemplateContent) {
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

            const errorResponse: CanCreateRelationshipErrorResponse = {
                isSuccess: false,
                error: RuntimeErrors.relationships.expiredRelationshipTemplate(
                    `The RelationshipTemplate '${template.id.toString()}' has already expired and therefore cannot be used to create a Relationship.`
                )
            };

            return Result.ok(errorResponse);
        }

        const successResponse: CanCreateRelationshipSuccessResponse = { isSuccess: true };
        return Result.ok(successResponse);
    }
}
