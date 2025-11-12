import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { RequestJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { RequestValidationResultDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, UseCase } from "../../common/index.js";
import { RequestValidationResultMapper } from "./RequestValidationResultMapper.js";

export interface CanCreateOutgoingRequestRequest {
    content: Omit<RequestJSON, "id" | "@type" | "@version">;
    peer?: AddressString;
}

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
