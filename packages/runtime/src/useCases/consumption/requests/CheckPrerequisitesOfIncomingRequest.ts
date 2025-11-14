import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RequestIdString, UseCase } from "../../common/index.js";
import { RequestMapper } from "./RequestMapper.js";

export interface CheckPrerequisitesOfIncomingRequestRequest {
    requestId: RequestIdString;
}

export class CheckPrerequisitesOfIncomingRequestUseCase extends UseCase<CheckPrerequisitesOfIncomingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: CheckPrerequisitesOfIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.checkPrerequisites({
            requestId: CoreId.from(request.requestId)
        });

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
