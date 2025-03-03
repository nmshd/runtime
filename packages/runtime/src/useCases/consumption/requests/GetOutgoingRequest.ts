import { ApplicationError, Result } from "@js-soft/ts-utils";
import { LocalRequest, OutgoingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface GetOutgoingRequestRequest {
    id: RequestIdString;
}

export class GetOutgoingRequestUseCase extends UseCase<GetOutgoingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly outgoingRequestsController: OutgoingRequestsController) {
        super();
    }

    protected async executeInternal(request: GetOutgoingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.outgoingRequestsController.getOutgoingRequest(CoreId.from(request.id));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        const dto = RequestMapper.toLocalRequestDTO(localRequest);

        return Result.ok(dto);
    }
}
