import { ApplicationError, Result } from "@js-soft/ts-utils";
import { ICompleteOutgoingRequestParameters, OutgoingRequestsController } from "@nmshd/consumption";
import { Response, ResponseJSON } from "@nmshd/content";
import { CoreId, Message, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { MessageIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CompleteOutgoingRequestRequest {
    receivedResponse: ResponseJSON;
    messageId: MessageIdString;
}

// class Validator extends SchemaValidator<CompleteOutgoingRequestRequest> {
//     public constructor(@Inject schemaRepository: SchemaRepository) {
//         super(schemaRepository.getSchema("CompleteOutgoingRequestRequest"));
//     }
// }

export class CompleteOutgoingRequestUseCase extends UseCase<CompleteOutgoingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController
    ) {
        super();
    }

    protected async executeInternal(request: CompleteOutgoingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const message = await this.messageController.getMessage(CoreId.from(request.messageId));

        if (!message) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Message));
        }

        const params: ICompleteOutgoingRequestParameters = {
            requestId: CoreId.from(request.receivedResponse.requestId),
            receivedResponse: Response.from(request.receivedResponse),
            responseSourceObject: message
        };

        const localRequest = await this.outgoingRequestsController.complete(params);

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
