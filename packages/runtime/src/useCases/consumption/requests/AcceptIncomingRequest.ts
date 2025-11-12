import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DecideRequestParametersJSON, IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common/index.js";
import { RequestMapper } from "./RequestMapper.js";

export interface AcceptIncomingRequestRequest extends DecideRequestParametersJSON {}

export class AcceptIncomingRequestUseCase extends UseCase<AcceptIncomingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: AcceptIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        let localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        localRequest = await this.incomingRequestsController.accept(request);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
