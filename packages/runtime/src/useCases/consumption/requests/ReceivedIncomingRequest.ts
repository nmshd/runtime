import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { Request, RequestJSON } from "@nmshd/content";
import { CoreId, Message, MessageController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { MessageIdString, RelationshipTemplateIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface ReceivedIncomingRequestRequest {
    receivedRequest: RequestJSON;
    requestSourceId: MessageIdString | RelationshipTemplateIdString;
}

export class ReceivedIncomingRequestUseCase extends UseCase<ReceivedIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: ReceivedIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        let requestSourceObject: Message | RelationshipTemplate | undefined;

        if (request.requestSourceId.startsWith("MSG")) {
            requestSourceObject = await this.messageController.getMessage(CoreId.from(request.requestSourceId));

            if (!requestSourceObject) {
                return Result.fail(RuntimeErrors.general.recordNotFound(Message));
            }
        } else {
            requestSourceObject = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.requestSourceId));

            if (!requestSourceObject) {
                return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
            }
        }

        const localRequest = await this.incomingRequestsController.received({
            receivedRequest: Request.from(request.receivedRequest),
            requestSourceObject
        });

        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }
}
