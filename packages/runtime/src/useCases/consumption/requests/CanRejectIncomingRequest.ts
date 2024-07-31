import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RequestValidationResultDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { RejectIncomingRequestRequest } from "./RejectIncomingRequest";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper";

export class CanRejectIncomingRequestUseCase extends UseCase<RejectIncomingRequestRequest, RequestValidationResultDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: RejectIncomingRequestRequest): Promise<Result<RequestValidationResultDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        if (localRequest.source?.type === "RelationshipTemplate") {
            const template = await this.relationshipTemplateController.getRelationshipTemplate(localRequest.source.reference);

            if (!template) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }

            if (template.cache?.expiresAt && template.isExpired()) {
                await this.incomingRequestsController.updateRequestExpiryRegardingTemplate(localRequest, template.cache.expiresAt);

                return Result.fail(
                    RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                        `The LocalRequest has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to.`
                    )
                );
            }
        }

        const result = await this.incomingRequestsController.canReject(request);

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(result);

        return Result.ok(dto);
    }
}
