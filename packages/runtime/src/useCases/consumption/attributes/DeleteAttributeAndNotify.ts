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
    ForwardedAttributeDeletedByPeerNotificationItem,
    Notification,
    OwnAttributeDeletedByOwnerNotificationItem,
    PeerRelationshipAttributeDeletedByPeerNotificationItem
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

    // TODO: what if only predecessor was shared -> different PR
    protected async executeInternal(request: DeleteAttributeAndNotifyRequest): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(attribute);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        let result: Result<DeleteAttributeAndNotifyResponse>;
        if (attribute instanceof OwnIdentityAttribute) {
            result = await this.notifyAboutDeletionOfOwnIdentityAttribute(attribute);
        } else if (attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute) {
            result = await this.notifyAboutDeletionOfRelationshipAttribute(attribute);
        } else if (attribute instanceof PeerIdentityAttribute || attribute instanceof ThirdPartyRelationshipAttribute) {
            result = await this.notifyAboutDeletionOfForwardedAttribute(attribute);
        } else {
            throw new Error("Type of LocalAttribute not found.");
        }

        if (result.isError) return result;

        await this.attributesController.executeFullAttributeDeletionProcess(attribute);

        await this.accountController.syncDatawallet();

        return result;
    }

    private async notifyAboutDeletionOfOwnIdentityAttribute(attribute: OwnIdentityAttribute): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({ attributeId: attribute.id });

        const forwardingPeers = attribute.getPeers(true);
        if (forwardingPeers.length === 0) return Result.ok({ notificationIds: [] });

        return await this.notifyForwardingPeers(forwardingPeers, notificationItem);
    }

    private async notifyAboutDeletionOfRelationshipAttribute(attribute: OwnRelationshipAttribute | PeerRelationshipAttribute) {
        const notificationItem =
            attribute instanceof OwnRelationshipAttribute
                ? OwnAttributeDeletedByOwnerNotificationItem.from({ attributeId: attribute.id })
                : PeerRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: attribute.id });

        const peerNotificationResult = await this.notifyPeer(attribute.peerSharingInfo.peer, notificationItem);
        if (peerNotificationResult.isError) return peerNotificationResult;

        const forwardingPeers = attribute.getThirdParties(true);
        if (forwardingPeers.length === 0) return peerNotificationResult;

        const forwardingNotificationResult = await this.notifyForwardingPeers(forwardingPeers, notificationItem);
        if (forwardingNotificationResult.isError) return forwardingNotificationResult;

        const notificationIds = [...peerNotificationResult.value.notificationIds, ...forwardingNotificationResult.value.notificationIds];
        return Result.ok({ notificationIds });
    }

    private async notifyAboutDeletionOfForwardedAttribute(attribute: PeerIdentityAttribute | ThirdPartyRelationshipAttribute) {
        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: attribute.id });

        return await this.notifyPeer(attribute.peerSharingInfo.peer, notificationItem);
    }

    private async notifyForwardingPeers(
        peers: CoreAddress[],
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem
    ): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const queryForRelationshipsToNotify = {
            "peer.address": { $in: peers.map((peer) => peer.toString()) },
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: PeerDeletionStatus.Deleted }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length === 0) return Result.ok({ notificationIds: [] });

        if (relationshipsToNotify.some((relationship) => relationship.status === RelationshipStatus.Pending)) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const notificationIds = [];

        const peersToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);
        for (const peer of peersToNotify) {
            const notificationId = await this.sendNotification(peer, notificationItem);
            notificationIds.push(notificationId);
        }

        return Result.ok({ notificationIds });
    }

    private async notifyPeer(
        peer: CoreAddress,
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedByPeerNotificationItem
    ): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const messageRecipientsValidationResult = await this.messageController.validateMessageRecipients([peer]);
        if (messageRecipientsValidationResult.isError) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const notificationId = await this.sendNotification(peer, notificationItem);
        return Result.ok({ notificationIds: [notificationId] });
    }

    private async sendNotification(
        peer: CoreAddress,
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem
    ): Promise<string> {
        const notificationId = await ConsumptionIds.notification.generate();
        const notification = Notification.from({ id: notificationId, items: [notificationItem] });

        await this.messageController.sendMessage({ recipients: [peer], content: notification });

        return notificationId.toString();
    }
}
