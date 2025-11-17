import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { RequestValidationResultDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { RejectIncomingRequestRequest } from "./RejectIncomingRequest.js";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper.js";

export class CanRejectIncomingRequestUseCase extends UseCase<RejectIncomingRequestRequest, RequestValidationResultDTO> {
    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: RejectIncomingRequestRequest): Promise<Result<RequestValidationResultDTO, ApplicationError>> {
        const result = await this.incomingRequestsController.canReject(request);

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(result);

        return Result.ok(dto);
    }
}
