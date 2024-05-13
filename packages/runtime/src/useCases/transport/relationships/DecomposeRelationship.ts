import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, NotificationsController, OutgoingRequestsController } from "@nmshd/consumption";
import { AccountController, CoreId, MessageController, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DecomposeRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<DecomposeRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DecomposeRelationshipRequest"));
    }
}

export class DecomposeRelationshipUseCase extends UseCase<DecomposeRelationshipRequest, null> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly outgoingRequestsController: OutgoingRequestsController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly notificationsController: NotificationsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DecomposeRelationshipRequest): Promise<Result<null, ApplicationError>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.relationshipId));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        if (!relationship.cache) {
            return Result.fail(RuntimeErrors.general.cacheEmpty(Relationship, relationship.id.toString()));
        }
        const peer = relationship.peer;

        await this.relationshipsController.decompose(relationship.id);
        await this.messageController.deleteMessagesOfRelationship(relationship);
        await this.incomingRequestsController.deleteRequestsFromPeer(peer.address);
        await this.outgoingRequestsController.deleteRequestsToPeer(peer.address);
        await this.notificationsController.deleteNotificationsWithPeer(peer.address);

        await this.accountController.syncDatawallet();

        return Result.ok(null);
    }
}
