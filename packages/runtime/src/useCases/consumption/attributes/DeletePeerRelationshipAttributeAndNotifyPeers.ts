import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, PeerRelationshipAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerRelationshipAttributeAndNotifyPeersRequest {
    attributeId: AttributeIdString;
}

// TODO: maybe an array for ids of third party notifications?
export interface DeletePeerRelationshipAttributeAndNotifyPeersResponse {
    notificationId?: NotificationIdString;
}

class Validator extends SchemaValidator<DeletePeerRelationshipAttributeAndNotifyPeersRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerRelationshipAttributeAndNotifyPeersRequest"));
    }
}

// TODO: name: notify owner and third parties is pretty long, maybe contacts? Also for other use cases.
export class DeletePeerRelationshipAttributeAndNotifyPeersUseCase extends UseCase<
    DeletePeerRelationshipAttributeAndNotifyPeersRequest,
    DeletePeerRelationshipAttributeAndNotifyPeersResponse
> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerRelationshipAttributeAndNotifyPeersRequest): Promise<Result<DeletePeerRelationshipAttributeAndNotifyPeersResponse>> {
        const peerRelationshipAttributeId = CoreId.from(request.attributeId);
        const peerRelationshipAttribute = await this.attributesController.getLocalAttribute(peerRelationshipAttributeId);
        if (!peerRelationshipAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(peerRelationshipAttribute instanceof PeerRelationshipAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotPeerSharedAttribute(peerRelationshipAttributeId)); // TODO:
        }

        const relationshipWithStatusPending = await this.relationshipsController.getRelationshipToIdentity(
            peerRelationshipAttribute.peerSharingInfo.peer,
            RelationshipStatus.Pending
        );
        if (relationshipWithStatusPending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(peerRelationshipAttribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(peerRelationshipAttribute);

        const peerNotificationId = await this.notifyPeer(peerRelationshipAttribute);
        await this.notifyThirdParties(peerRelationshipAttribute);

        await this.accountController.syncDatawallet();

        const result = peerNotificationId ? { notificationId: peerNotificationId.toString() } : {};
        return Result.ok(result);
    }

    // TODO: maybe share code between use cases?
    private async notifyPeer(peerRelationshipAttribute: PeerRelationshipAttribute): Promise<CoreId | undefined> {
        const peer = peerRelationshipAttribute.peerSharingInfo.peer;
        const messageRecipientValidationResult = await this.messageController.validateMessageRecipients([peer]);
        if (messageRecipientValidationResult.isError) return;

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = PeerSharedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerRelationshipAttribute.id });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [peer],
            content: notification
        });

        return notificationId;
    }

    // TODO: return notificationIds?
    private async notifyThirdParties(peerRelationshipAttribute: PeerRelationshipAttribute): Promise<void> {
        const thirdParties = peerRelationshipAttribute.getThirdParties();
        if (thirdParties.length === 0) return;

        const queryForRelationshipsToNotify = {
            "peer.address": thirdParties.map((thirdParty) => thirdParty.toString()),
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: "Deleted" }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length > 0) return;

        const thirdPartiesToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);

        // TODO: probably requires new NotificationItem
        const notificationItem = PeerSharedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerRelationshipAttribute.id });

        for (const thirdParty of thirdPartiesToNotify) {
            const notificationId = await ConsumptionIds.notification.generate();
            const notification = Notification.from({
                id: notificationId,
                items: [notificationItem]
            });

            // TODO: this will fail for relationships with status Pending -> maybe Backbone can queue then as well?
            await this.messageController.sendMessage({
                recipients: [thirdParty],
                content: notification
            });
        }
    }
}
