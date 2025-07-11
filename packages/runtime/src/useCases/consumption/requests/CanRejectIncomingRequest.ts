import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { RequestValidationResultDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";
import { RejectIncomingRequestRequest } from "./RejectIncomingRequest";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper";

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
