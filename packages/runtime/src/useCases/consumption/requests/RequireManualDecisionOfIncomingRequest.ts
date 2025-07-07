import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RequestIdString, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface RequireManualDecisionOfIncomingRequestRequest {
    requestId: RequestIdString;
}

export class RequireManualDecisionOfIncomingRequestUseCase extends UseCase<RequireManualDecisionOfIncomingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: RequireManualDecisionOfIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.requireManualDecision({
            requestId: CoreId.from(request.requestId)
        });

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
