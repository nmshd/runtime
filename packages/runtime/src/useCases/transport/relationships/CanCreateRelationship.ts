import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequestStatus } from "@nmshd/consumption";
import { RelationshipTemplateContent, ResponseResult } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
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

        const canSendRelationship = await this.relationshipController.canSendRelationship({ creationContent: request.creationContent, template });

        if (!canSendRelationship.isSuccess) {
            if (canSendRelationship.error.code === "error.transport.relationships.expiredRelationshipTemplate") {
                if (!template.cache) {
                    return Result.fail(RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString()));
                }

                if (template.cache.content instanceof RelationshipTemplateContent) {
                    const dbQuery: any = {};
                    dbQuery["source.reference"] = { $eq: template.id.toString() };
                    dbQuery["status"] = { $neq: LocalRequestStatus.Completed };
                    const nonCompletedRequestsFromTemplate = await this.incomingRequestsController.getIncomingRequests(dbQuery);

                    if (nonCompletedRequestsFromTemplate.length !== 0 && template.cache.expiresAt) {
                        for (const localRequest of nonCompletedRequestsFromTemplate) {
                            if (!(localRequest.status === LocalRequestStatus.Decided && localRequest.response?.content.result === ResponseResult.Rejected)) {
                                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);
                            }
                        }
                    }
                }
            }

            const errorResponse: CanCreateRelationshipErrorResponse = {
                isSuccess: false,
                error: canSendRelationship.error
            };

            return Result.ok(errorResponse);
        }

        const successResponse: CanCreateRelationshipSuccessResponse = { isSuccess: true };
        return Result.ok(successResponse);
    }
}
