import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DecideRequestParametersJSON, IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId, RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { CanCreateRelationshipUseCase } from "../../transport/relationships/CanCreateRelationship";
import { RequestMapper } from "./RequestMapper";

export interface RejectIncomingRequestRequest extends DecideRequestParametersJSON {}

export class RejectIncomingRequestUseCase extends UseCase<RejectIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,
        @Inject private readonly canCreateRelationshipUseCase: CanCreateRelationshipUseCase
    ) {
        super();
    }

    protected async executeInternal(request: RejectIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        let localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        if (localRequest.source?.type === "RelationshipTemplate") {
            const template = await this.relationshipTemplateController.getRelationshipTemplate(localRequest.source.reference);

            if (!template) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }

            const queryForExistingRelationships: any = {
                "peer.address": localRequest.peer.toString(),
                status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated, RelationshipStatus.DeletionProposed] }
            };

            const existingRelationshipsToPeer = await this.relationshipController.getRelationships(queryForExistingRelationships);

            if (existingRelationshipsToPeer.length === 0) {
                const canCreateRelationshipResult = (await this.canCreateRelationshipUseCase.execute({ templateId: template.id.toString() })).value;
                if (!canCreateRelationshipResult.isSuccess) {
                    return Result.fail(canCreateRelationshipResult.error);
                }
            }
        }

        localRequest = await this.incomingRequestsController.reject(request);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
