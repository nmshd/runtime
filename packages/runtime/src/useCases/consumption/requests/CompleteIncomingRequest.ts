import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController } from "@nmshd/consumption";
import { CoreId, IMessage, IRelationshipChange, Message, MessageController, RelationshipChange, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO } from "../../../types";
import { MessageIdString, RelationshipChangeIdString, RequestIdString, RuntimeErrors, UseCase } from "../../common";
import { RequestMapper } from "./RequestMapper";

export interface CompleteIncomingRequestRequest {
    requestId: RequestIdString;
    responseSourceId?: MessageIdString | RelationshipChangeIdString;
}

// class Validator extends SchemaValidator<CompleteIncomingRequestRequest> {
//     public constructor(@Inject schemaRepository: SchemaRepository) {
//         super(schemaRepository.getSchema("CompleteIncomingRequestRequest"));
//     }
// }

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

    private async getResponseSourceObject(request: CompleteIncomingRequestRequest): Promise<IMessage | IRelationshipChange | undefined> {
        if (!request.responseSourceId) return;

        if (request.responseSourceId.startsWith("MSG")) {
            const message = await this.messageController.getMessage(CoreId.from(request.responseSourceId));
            if (!message) throw RuntimeErrors.general.recordNotFound(Message);

            return message;
        }

        const relationships = await this.relationshipController.getRelationships({ "cache.changes.id": request.responseSourceId });
        if (relationships.length === 0) {
            throw RuntimeErrors.general.recordNotFound(RelationshipChange);
        }

        return relationships[0].cache!.creationChange;
    }
}
