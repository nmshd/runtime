import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DecideRequestParametersJSON, IncomingRequestsController, LocalRequest, LocalRequestStatus } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface RejectIncomingRequestRequest extends DecideRequestParametersJSON {}

export class RejectIncomingRequestUseCase extends UseCase<RejectIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: RejectIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        let localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

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
                    RuntimeErrors.relationships.expiredRelationshipTemplate(
                        `The incoming Request has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to.`
                    )
                );
            }
        }

        localRequest = await this.incomingRequestsController.reject(request);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
