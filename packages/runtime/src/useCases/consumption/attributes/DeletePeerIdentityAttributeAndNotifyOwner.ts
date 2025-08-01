import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, PeerIdentityAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipStatus } from "@nmshd/runtime-types";
import { AccountController, MessageController, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerIdentityAttributeAndNotifyOwnerRequest {
    attributeId: AttributeIdString;
}

export interface DeletePeerIdentityAttributeAndNotifyOwnerResponse {
    notificationId?: NotificationIdString;
}

class Validator extends SchemaValidator<DeletePeerIdentityAttributeAndNotifyOwnerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerIdentityAttributeAndNotifyOwnerRequest"));
    }
}

export class DeletePeerIdentityAttributeAndNotifyOwnerUseCase extends UseCase<DeletePeerIdentityAttributeAndNotifyOwnerRequest, DeletePeerIdentityAttributeAndNotifyOwnerResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerIdentityAttributeAndNotifyOwnerRequest): Promise<Result<DeletePeerIdentityAttributeAndNotifyOwnerResponse>> {
        const peerIdentityAttributeId = CoreId.from(request.attributeId);
        const peerIdentityAttribute = await this.attributesController.getLocalAttribute(peerIdentityAttributeId);
        if (!peerIdentityAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(peerIdentityAttribute instanceof PeerIdentityAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotPeerSharedAttribute(peerIdentityAttributeId)); // TODO:
        }

        const peer = peerIdentityAttribute.peerSharingInfo.peer;
        const relationshipWithStatusPending = await this.relationshipsController.getRelationshipToIdentity(peer, RelationshipStatus.Pending);
        if (relationshipWithStatusPending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(peerIdentityAttribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(peerIdentityAttribute);

        const messageRecipientsValidationResult = await this.messageController.validateMessageRecipients([peer]);
        if (messageRecipientsValidationResult.isError) return Result.ok({});

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = PeerSharedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerIdentityAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const result = { notificationId: notificationId.toString() };
        return Result.ok(result);
    }
}
