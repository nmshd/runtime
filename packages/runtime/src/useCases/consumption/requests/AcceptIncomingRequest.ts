import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DecideRequestParametersJSON, IncomingRequestsController, LocalRequest, LocalRequestStatus } from "@nmshd/consumption";
import { CoreId, RelationshipsController, RelationshipStatus, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface AcceptIncomingRequestRequest extends DecideRequestParametersJSON {}

export class AcceptIncomingRequestUseCase extends UseCase<AcceptIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: AcceptIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
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

            const queryForExistingRelationship: any = {
                "peer.address": localRequest.peer,
                $and: [
                    {
                        ["status"]: { $neq: RelationshipStatus.Rejected }
                    },
                    {
                        ["status"]: { $neq: RelationshipStatus.Revoked }
                    }
                ]
            };

            const existingRelationshipToPeer = await this.relationshipController.getRelationships(queryForExistingRelationship);

            if (existingRelationshipToPeer.length === 0 && template.cache?.expiresAt && template.isExpired()) {
                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);

                return Result.fail(
                    RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                        `The LocalRequest has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to in order to accept or to reject the creation of a Relationship.`
                    )
                );
            }
        }

        localRequest = await this.incomingRequestsController.accept(request);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
