import { Result } from "@js-soft/ts-utils";
import {
    AttributesController,
    ConsumptionIds,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute
} from "@nmshd/consumption";
import {
    ForwardedAttributeDeletedNotificationItem,
    Notification,
    OwnSharedAttributeDeletedByOwnerNotificationItem,
    PeerSharedAttributeDeletedByPeerNotificationItem
} from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { RelationshipStatus } from "@nmshd/runtime-types";
import { AccountController, MessageController, PeerDeletionStatus, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteAttributeAndNotifyRequest {
    attributeId: AttributeIdString;
}

export interface DeleteAttributeAndNotifyResponse {
    notificationIds: NotificationIdString[];
}

class Validator extends SchemaValidator<DeleteAttributeAndNotifyRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteAttributeAndNotifyRequest"));
    }
}

export class DeleteAttributeAndNotifyUseCase extends UseCase<DeleteAttributeAndNotifyRequest, DeleteAttributeAndNotifyResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    // TODO: what if only predecessor was shared
    protected async executeInternal(request: DeleteAttributeAndNotifyRequest): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(attribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(attribute);

        let notificationIds: NotificationIdString[] = [];
        if (attribute instanceof OwnIdentityAttribute) {
            notificationIds = await this.notifyAboutDeletionOfOwnIdentityAttribute(attribute);
        }

        if (attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute) {
            notificationIds = await this.notifyAboutDeletionOfRelationshipAttribute(attribute);
        }

        if (attribute instanceof PeerIdentityAttribute || attribute instanceof ThirdPartyRelationshipAttribute) {
            notificationIds = await this.notifyAboutDeletionOfForwardedAttribute(attribute);
        }

        await this.accountController.syncDatawallet();

        return Result.ok({ notificationIds });
    }

    private async notifyAboutDeletionOfOwnIdentityAttribute(attribute: OwnIdentityAttribute): Promise<NotificationIdString[]> {
        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: attribute.id });

        const forwardingPeers = attribute.getPeers();
        if (forwardingPeers.length === 0) return [];

        const notificationIds = await this.notifyForwardingPeers(forwardingPeers, notificationItem);
        return notificationIds;
    }

    private async notifyAboutDeletionOfRelationshipAttribute(attribute: OwnRelationshipAttribute | PeerRelationshipAttribute) {
        const notificationItem =
            attribute instanceof OwnRelationshipAttribute
                ? OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: attribute.id })
                : PeerSharedAttributeDeletedByPeerNotificationItem.from({ attributeId: attribute.id });

        const peerNotificationId = await this.notifyPeer(attribute.peerSharingInfo.peer, notificationItem);

        const forwardingPeers = attribute.getThirdParties();
        if (forwardingPeers.length === 0) return peerNotificationId;

        const forwardingNotificationIds = await this.notifyForwardingPeers(forwardingPeers, notificationItem);

        return [...peerNotificationId, ...forwardingNotificationIds];
    }

    private async notifyAboutDeletionOfForwardedAttribute(attribute: PeerIdentityAttribute | ThirdPartyRelationshipAttribute) {
        const notificationItem = ForwardedAttributeDeletedNotificationItem.from({ attributeId: attribute.id });

        const notificationId = await this.notifyPeer(attribute.peerSharingInfo.peer, notificationItem);
        return notificationId;
    }

    private async notifyForwardingPeers(
        peers: CoreAddress[],
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem | PeerSharedAttributeDeletedByPeerNotificationItem
    ) {
        const queryForRelationshipsToNotify = {
            "peer.address": { $in: peers.map((peer) => peer.toString()) },
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: PeerDeletionStatus.Deleted }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length === 0) return [];

        const notificationIds = [];

        const peersToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);
        for (const peer of peersToNotify) {
            const notificationId = await this.sendNotification(peer, notificationItem);
            notificationIds.push(notificationId);
        }

        return notificationIds;
    }

    private async notifyPeer(
        peer: CoreAddress,
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem | PeerSharedAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedNotificationItem
    ) {
        const messageRecipientsValidationResult = await this.messageController.validateMessageRecipients([peer]);
        if (messageRecipientsValidationResult.isError) return [];

        const notificationId = await this.sendNotification(peer, notificationItem);
        return [notificationId];
    }

    private async sendNotification(
        peer: CoreAddress,
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem | PeerSharedAttributeDeletedByPeerNotificationItem
    ): Promise<string> {
        const notificationId = await ConsumptionIds.notification.generate();
        const notification = Notification.from({ id: notificationId, items: [notificationItem] });

        await this.messageController.sendMessage({ recipients: [peer], content: notification });

        return notificationId.toString();
    }
}
