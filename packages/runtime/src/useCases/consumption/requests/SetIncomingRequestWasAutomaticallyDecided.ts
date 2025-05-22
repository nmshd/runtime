import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface SetIncomingRequestWasAutomaticallyDecidedRequest {
    id: RequestIdString;
}

export class SetIncomingRequestWasAutomaticallyDecidedUseCase extends UseCase<SetIncomingRequestWasAutomaticallyDecidedRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly accountController: AccountController
    ) {
        super();
    }

    protected async executeInternal(request: SetIncomingRequestWasAutomaticallyDecidedRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.id));

        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        const updatedLocalRequest = await this.incomingRequestsController.setWasAutomaticallyDecided(localRequest);

        await this.accountController.syncDatawallet();

        return Result.ok(RequestMapper.toLocalRequestDTO(updatedLocalRequest));
    }
}
