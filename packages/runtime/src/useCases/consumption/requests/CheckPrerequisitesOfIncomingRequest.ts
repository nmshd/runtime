import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { RequestIdString, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CheckPrerequisitesOfIncomingRequestRequest {
    requestId: RequestIdString;
}

// class Validator extends SchemaValidator<CheckPrerequisitesOfIncomingRequestRequest> {
//     public constructor(@Inject schemaRepository: SchemaRepository) {
//         super(schemaRepository.getSchema("CheckPrerequisitesOfIncomingRequestRequest"));
//     }
// }

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
