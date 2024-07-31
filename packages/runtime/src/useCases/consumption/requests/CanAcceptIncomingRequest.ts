import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RequestValidationResultDTO } from "../../../types";
import { RuntimeErrors, UseCase } from "../../common";
import { AcceptIncomingRequestRequest } from "./AcceptIncomingRequest";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper";

export class CanAcceptIncomingRequestUseCase extends UseCase<AcceptIncomingRequestRequest, RequestValidationResultDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: AcceptIncomingRequestRequest): Promise<Result<RequestValidationResultDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        if (localRequest.source?.type === "RelationshipTemplate") {
            const template = await this.relationshipTemplateController.getRelationshipTemplate(localRequest.source.reference);

            if (!template) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }

            if (template.isExpired()) {
                return Result.fail(
                    RuntimeErrors.relationshipTemplates.expiredRelationshipTemplate(
                        `The LocalRequest has the already expired RelationshipTemplate '${template.id.toString()}' as its source, which is why it cannot be responded to.`
                    )
                );
            }
        }

        const result = await this.incomingRequestsController.canAccept(request);

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(result);

        return Result.ok(dto);
    }
}
