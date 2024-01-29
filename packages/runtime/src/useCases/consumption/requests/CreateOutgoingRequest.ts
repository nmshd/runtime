import { ApplicationError, Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { RequestJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { AddressString, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CreateOutgoingRequestRequest {
    content: Omit<RequestJSON, "id" | "@type" | "@version">;
    peer: AddressString;
}

export class CreateOutgoingRequestUseCase extends UseCase<CreateOutgoingRequestRequest, LocalRequestDTO> {
    public constructor(@Inject private readonly outgoingRequestsController: OutgoingRequestsController) {
        super();
    }

    protected async executeInternal(request: CreateOutgoingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const localRequest = await this.outgoingRequestsController.create({
            content: request.content,
            peer: CoreAddress.from(request.peer)
        });

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
