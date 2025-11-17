import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ISentOutgoingRequestParameters, OutgoingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { Message, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { MessageIdString, RequestIdString, RuntimeErrors, UseCase } from "../../common/index.js";
import { RequestMapper } from "./RequestMapper.js";

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
