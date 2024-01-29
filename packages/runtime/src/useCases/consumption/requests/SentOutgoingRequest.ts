import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ISentOutgoingRequestParameters, OutgoingRequestsController } from "@nmshd/consumption";
import { CoreId, Message, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { MessageIdString, RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface SentOutgoingRequestRequest {
    requestId: RequestIdString;
    messageId: MessageIdString;
}

export class SentOutgoingRequestUseCase extends UseCase<SentOutgoingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController
    ) {
        super();
    }

    protected async executeInternal(request: SentOutgoingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const message = await this.messageController.getMessage(CoreId.from(request.messageId));

        if (!message) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Message));
        }

        const params: ISentOutgoingRequestParameters = {
            requestId: CoreId.from(request.requestId),
            requestSourceObject: message
        };

        const localRequest = await this.outgoingRequestsController.sent(params);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
