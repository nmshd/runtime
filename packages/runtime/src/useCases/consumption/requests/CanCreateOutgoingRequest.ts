import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { RequestJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RequestValidationResultDTO } from "../../../types";
import { AddressString, UseCase } from "../../common";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper";

export interface CanCreateOutgoingRequestRequest {
    content: Omit<RequestJSON, "id" | "@type" | "@version">;
    peer?: AddressString;
}

// class Validator extends SchemaValidator<CanCreateOutgoingRequestRequest> {
//     public constructor(@Inject schemaRepository: SchemaRepository) {
//         super(schemaRepository.getSchema("CanCreateOutgoingRequestRequest"));
//     }
// }

export class CanCreateOutgoingRequestUseCase extends UseCase<CanCreateOutgoingRequestRequest, RequestValidationResultDTO> {
    public constructor(@Inject private readonly outgoingRequestsController: OutgoingRequestsController) {
        super();
    }

    protected async executeInternal(request: CanCreateOutgoingRequestRequest): Promise<Result<RequestValidationResultDTO, ApplicationError>> {
        const validationResult = await this.outgoingRequestsController.canCreate({
            content: request.content,
            peer: request.peer ? CoreAddress.from(request.peer) : undefined
        });

        const dto = RequestValidationResultMapper.toRequestValidationResultDTO(validationResult);

        return Result.ok(dto);
    }
}
