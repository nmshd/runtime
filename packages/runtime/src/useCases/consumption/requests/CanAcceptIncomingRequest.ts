import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ErrorValidationResult, IncomingRequestsController, LocalRequest, LocalRequestStatus } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
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

            const existingRelationshipsToPeer = await this.relationshipController.getExistingRelationshipsToIdentity(localRequest.peer);

            if (existingRelationshipsToPeer.length === 0 && template.cache?.expiresAt && template.isExpired()) {
                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);

                const errorResult = new ErrorValidationResult(RuntimeErrors.relationshipTemplates.relationshipTemplateIsExpired(template.id), []);

                const dto = RequestValidationResultMapper.toRequestValidationResultDTO(errorResult);

                return Result.ok(dto);
            }
        }

        const result = await this.incomingRequestsController.canAccept(request);

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(result);

        return Result.ok(dto);
    }
}
