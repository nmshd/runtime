import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreErrors, CoreId, RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateIdString, RuntimeErrors, UseCase } from "../../common";

export interface CanCreateRelationshipRequest {
    templateId: RelationshipTemplateIdString;
}

export type CanCreateRelationshipResult = CanCreateRelationshipSuccessResult | CanCreateRelationshipErrorResult;

interface CanCreateRelationshipSuccessResult {
    isSuccess: true;
}

interface CanCreateRelationshipErrorResult {
    isSuccess: false;
    error: ApplicationError;
}

export class CanCreateRelationshipUseCase extends UseCase<CanCreateRelationshipRequest, CanCreateRelationshipResult> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: CanCreateRelationshipRequest): Promise<Result<CanCreateRelationshipResult, ApplicationError>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        const queryForExistingRelationships: any = {
            "peer.address": template.cache?.createdBy.toString(),
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
        };

        const existingRelationshipsToPeer = await this.relationshipController.getRelationships(queryForExistingRelationships);

        if (existingRelationshipsToPeer.length !== 0) {
            const errorResult: CanCreateRelationshipErrorResult = {
                isSuccess: false,
                error: CoreErrors.relationships.relationshipCurrentlyExists(existingRelationshipsToPeer[0].status)
            };

            return Result.ok(errorResult);
        }

        if (template.cache?.content instanceof RelationshipTemplateContent) {
            const dbQuery: any = {};
            dbQuery["source.reference"] = { $eq: template.id.toString() };
            dbQuery["status"] = { $nin: [LocalRequestStatus.Decided, LocalRequestStatus.Completed, LocalRequestStatus.Expired] };
            const relevantRequestsFromTemplate = await this.incomingRequestsController.getIncomingRequests(dbQuery);

            if (relevantRequestsFromTemplate.length !== 0) {
                const localRequest = relevantRequestsFromTemplate[0];

                if (template.cache.expiresAt && template.isExpired()) {
                    await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);

                    const errorResult: CanCreateRelationshipErrorResult = {
                        isSuccess: false,
                        error: RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                            `The LocalRequest has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to in order to accept or to reject the creation of a Relationship.`
                        )
                    };

                    return Result.ok(errorResult);
                }
            }
        }

        if (template.cache?.content instanceof ArbitraryRelationshipTemplateContent) {
            if (template.isExpired()) {
                const errorResult: CanCreateRelationshipErrorResult = {
                    isSuccess: false,
                    error: RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                        `The RelationshipTemplate '${template.id.toString()}' has already expired and therefore cannot be used to create a Relationship.`
                    )
                };

                return Result.ok(errorResult);
            }
        }

        const successResult: CanCreateRelationshipSuccessResult = { isSuccess: true };
        return Result.ok(successResult);
    }
}
