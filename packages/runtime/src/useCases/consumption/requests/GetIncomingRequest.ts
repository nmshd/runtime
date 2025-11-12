import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RequestIdString, RuntimeErrors, UseCase } from "../../common/index.js";
import { RequestMapper } from "./RequestMapper.js";

export interface GetIncomingRequestRequest {
    id: RequestIdString;
}

export class GetIncomingRequestUseCase extends UseCase<GetIncomingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: GetIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.id));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        const dto = RequestMapper.toLocalRequestDTO(localRequest);

        return Result.ok(dto);
    }
}
