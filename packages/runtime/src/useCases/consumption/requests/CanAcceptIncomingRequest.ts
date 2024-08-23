import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest, LocalRequestStatus } from "@nmshd/consumption";
import { CoreId, RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RequestValidationResultDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { AcceptIncomingRequestRequest } from "./AcceptIncomingRequest";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper";

export class CanAcceptIncomingRequestUseCase extends UseCase<AcceptIncomingRequestRequest, RequestValidationResultDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: AcceptIncomingRequestRequest): Promise<Result<RequestValidationResultDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        if (
            localRequest.source?.type === "RelationshipTemplate" &&
            ![LocalRequestStatus.Decided, LocalRequestStatus.Completed, LocalRequestStatus.Expired].includes(localRequest.status)
        ) {
            const template = await this.relationshipTemplateController.getRelationshipTemplate(localRequest.source.reference);

            if (!template) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }

            const queryForExistingRelationships: any = {
                "peer.address": localRequest.peer.toString(),
                status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
            };

            const existingRelationshipsToPeer = await this.relationshipController.getRelationships(queryForExistingRelationships);

            if (existingRelationshipsToPeer.length === 0 && template.cache?.expiresAt && template.isExpired()) {
                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);

                return Result.fail(
                    RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                        `The incoming Request has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to in order to accept or to reject the creation of a Relationship.`
                    )
                );
            }
        }

        const result = await this.incomingRequestsController.canAccept(request);

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(result);

        return Result.ok(dto);
    }
}
