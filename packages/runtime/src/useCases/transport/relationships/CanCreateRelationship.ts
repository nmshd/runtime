import { Serializable } from "@js-soft/ts-serval";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { ArbitraryRelationshipTemplateContent, RelationshipTemplateContent } from "@nmshd/content";
import { CoreErrors, CoreId, RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { CreateRelationshipRequest } from "./CreateRelationship";

export type CanCreateRelationshipResult = CanCreateRelationshipSuccessResult | CanCreateRelationshipErrorResult;

interface CanCreateRelationshipSuccessResult {
    isSuccess: true;
}

interface CanCreateRelationshipErrorResult {
    isSuccess: false;
    error: ApplicationError;
}

export class CanCreateRelationshipUseCase extends UseCase<CreateRelationshipRequest, CanCreateRelationshipResult> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: CreateRelationshipRequest): Promise<Result<CanCreateRelationshipResult, ApplicationError>> {
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
                error: CoreErrors.relationships.relationshipAlreadyExists(existingRelationshipsToPeer[0].status)
            };

            return Result.ok(errorResult);
        }

        const transformedContent = Serializable.fromUnknown(template.cache?.content);

        if (transformedContent instanceof RelationshipTemplateContent) {
            const existingRequestsFromTemplate = await this.incomingRequestsController.getIncomingRequests({ query: { "source.reference": template.id } });
            const relevantRequestsFromTemplate = existingRequestsFromTemplate.filter(
                (r) => r.status !== LocalRequestStatus.Decided && r.status !== LocalRequestStatus.Completed && r.status !== LocalRequestStatus.Expired
            );

            if (relevantRequestsFromTemplate.length !== 0) {
                const localRequest = relevantRequestsFromTemplate[0];

                if (template.cache?.expiresAt && template.isExpired()) {
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

        if (transformedContent instanceof ArbitraryRelationshipTemplateContent) {
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
