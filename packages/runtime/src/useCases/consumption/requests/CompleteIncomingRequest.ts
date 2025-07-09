import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalRequestDTO } from "@nmshd/runtime-types";
import { IMessage, IRelationship, Message, MessageController, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { MessageIdString, RelationshipIdString, RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CompleteIncomingRequestRequest {
    requestId: RequestIdString;
    responseSourceId?: MessageIdString | RelationshipIdString;
}

export class CompleteIncomingRequestUseCase extends UseCase<CompleteIncomingRequestRequest, LocalRequestDTO> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipController: RelationshipsController
    ) {
        super();
    }

    protected async executeInternal(request: CompleteIncomingRequestRequest): Promise<Result<LocalRequestDTO, ApplicationError>> {
        const responseSourceObject = await this.getResponseSourceObject(request);
        const requestId = CoreId.from(request.requestId);
        const localRequest = await this.incomingRequestsController.complete({ requestId, responseSourceObject });
        return Result.ok(RequestMapper.toLocalRequestDTO(localRequest));
    }

    private async getResponseSourceObject(request: CompleteIncomingRequestRequest): Promise<IMessage | IRelationship | undefined> {
        if (!request.responseSourceId) return;

        if (request.responseSourceId.startsWith("MSG")) {
            const message = await this.messageController.getMessage(CoreId.from(request.responseSourceId));
            if (!message) throw RuntimeErrors.general.recordNotFound(Message);

            return message;
        }

        const relationship = await this.relationshipController.getRelationship(CoreId.from(request.responseSourceId));
        if (!relationship) {
            throw RuntimeErrors.general.recordNotFound(Relationship);
        }

        return relationship;
    }
}
