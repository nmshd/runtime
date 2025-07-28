import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, OwnRelationshipAttribute } from "@nmshd/consumption";
import { Notification, OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController, MessageController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteOwnRelationshipAttributeAndNotifyPeersRequest {
    attributeId: AttributeIdString;
}

// TODO: maybe an array for ids of third party notifications?
export interface DeleteOwnRelationshipAttributeAndNotifyPeersResponse {
    notificationId?: NotificationIdString;
}

class Validator extends SchemaValidator<DeleteOwnRelationshipAttributeAndNotifyPeersRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteOwnRelationshipAttributeAndNotifyPeersRequest"));
    }
}

export class DeleteOwnRelationshipAttributeAndNotifyPeersUseCase extends UseCase<
    DeleteOwnRelationshipAttributeAndNotifyPeersRequest,
    DeleteOwnRelationshipAttributeAndNotifyPeersResponse
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

    protected async executeInternal(request: DeleteOwnRelationshipAttributeAndNotifyPeersRequest): Promise<Result<DeleteOwnRelationshipAttributeAndNotifyPeersResponse>> {
        const ownRelationshipAttributeId = CoreId.from(request.attributeId);
        const ownRelationshipAttribute = await this.attributesController.getLocalAttribute(ownRelationshipAttributeId);
        if (!ownRelationshipAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!(ownRelationshipAttribute instanceof OwnRelationshipAttribute)) {
            return Result.fail(RuntimeErrors.attributes.isNotOwnSharedAttribute(ownRelationshipAttributeId)); // TODO:
        }

        const relationshipWithStatusPending = await this.relationshipsController.getRelationshipToIdentity(
            ownRelationshipAttribute.peerSharingInfo.peer,
            RelationshipStatus.Pending
        );
        if (relationshipWithStatusPending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(ownRelationshipAttribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(ownRelationshipAttribute);

        const peerNotificationId = await this.notifyPeer(ownRelationshipAttribute);
        await this.notifyThirdParties(ownRelationshipAttribute);

        await this.accountController.syncDatawallet();

        const result = peerNotificationId ? { notificationId: peerNotificationId.toString() } : {};
        return Result.ok(result);
    }

    private async notifyPeer(ownRelationshipAttribute: OwnRelationshipAttribute): Promise<CoreId | undefined> {
        const peer = ownRelationshipAttribute.peerSharingInfo.peer;
        const messageRecipientValidationResult = await this.messageController.validateMessageRecipients([peer]);
        if (messageRecipientValidationResult.isError) return;

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: ownRelationshipAttribute.id });
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
    private async notifyThirdParties(ownRelationshipAttribute: OwnRelationshipAttribute): Promise<void> {
        const thirdParties = ownRelationshipAttribute.getThirdParties();
        if (thirdParties.length === 0) return;

        const queryForRelationshipsToNotify = {
            "peer.address": thirdParties.map((thirdParty) => thirdParty.toString()),
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: "Deleted" }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length > 0) return;

        const thirdPartiesToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);

        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: ownRelationshipAttribute.id });

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
