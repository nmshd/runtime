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

        const getPeersToNotifyResult = await this.getPeersToNotify(attribute);
        if (getPeersToNotifyResult.isError) return Result.fail(getPeersToNotifyResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(attribute);

        const notificationItem = this.createAttributeDeletedNotificationItem(attribute);
        const notificationIds = await this.notifyPeers(getPeersToNotifyResult.value, notificationItem);

        await this.accountController.syncDatawallet();

        return Result.ok({ notificationIds });
    }

    private async getPeersToNotify(attribute: LocalAttribute): Promise<Result<CoreAddress[]>> {
        const attributeType = (attribute.constructor as any).name;
        switch (attributeType) {
            case OwnIdentityAttribute.name:
                return await this.getForwardingPeersOfAttribute(attribute as OwnIdentityAttribute);
            case OwnRelationshipAttribute.name:
            case PeerRelationshipAttribute.name:
                return await this.getPeersOfRelationshipAttribute(attribute as OwnRelationshipAttribute | PeerRelationshipAttribute);
            case PeerIdentityAttribute.name:
            case ThirdPartyRelationshipAttribute.name:
                return await this.getPeerOfAttribute(attribute as PeerIdentityAttribute | ThirdPartyRelationshipAttribute);
            default:
                throw new Error("Type of LocalAttribute not found.");
        }
    }

    private async getPeersOfRelationshipAttribute(attribute: OwnRelationshipAttribute | PeerRelationshipAttribute): Promise<Result<CoreAddress[]>> {
        const getPeerOfAttributeResult = await this.getPeerOfAttribute(attribute);
        if (getPeerOfAttributeResult.isError) return getPeerOfAttributeResult;

        const getForwardingPeersResult = await this.getForwardingPeersOfAttribute(attribute);
        if (getForwardingPeersResult.isError) return getForwardingPeersResult;

        const allPeers = [...getPeerOfAttributeResult.value, ...getForwardingPeersResult.value];
        return Result.ok(allPeers);
    }

    private async getForwardingPeersOfAttribute(attribute: OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute): Promise<Result<CoreAddress[]>> {
        const forwardingPeers = attribute.getForwardingPeers(true);
        if (forwardingPeers.length === 0) return Result.ok([]);

        const queryForRelationshipsToNotify = {
            "peer.address": { $in: forwardingPeers.map((peer) => peer.toString()) },
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: PeerDeletionStatus.Deleted }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length === 0) return Result.ok([]);

        if (relationshipsToNotify.some((relationship) => relationship.status === RelationshipStatus.Pending)) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        const peersToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);
        return Result.ok(peersToNotify);
    }

    private async getPeerOfAttribute(
        attribute: OwnRelationshipAttribute | PeerRelationshipAttribute | PeerIdentityAttribute | ThirdPartyRelationshipAttribute
    ): Promise<Result<CoreAddress[]>> {
        const peer = attribute.peerSharingDetails.peer;
        const relationship = await this.relationshipsController.getRelationshipToIdentity(peer);
        if (
            !relationship ||
            relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted ||
            ![RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated].includes(relationship.status)
        ) {
            return Result.ok([]);
        }

        if (relationship.status === RelationshipStatus.Pending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending());
        }

        return Result.ok([peer]);
    }

    private createAttributeDeletedNotificationItem(
        attribute: LocalAttribute
    ): OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedByPeerNotificationItem {
        const attributeType = (attribute.constructor as any).name;
        switch (attributeType) {
            case OwnIdentityAttribute.name:
            case OwnRelationshipAttribute.name:
                return OwnAttributeDeletedByOwnerNotificationItem.from({ attributeId: attribute.id });
            case PeerRelationshipAttribute.name:
                return PeerRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: attribute.id });
            case PeerIdentityAttribute.name:
            case ThirdPartyRelationshipAttribute.name:
                return ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: attribute.id });
            default:
                throw new Error("Type of LocalAttribute not found.");
        }
    }

    private async notifyPeers(
        peers: CoreAddress[],
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedByPeerNotificationItem
    ): Promise<string[]> {
        const notificationIds = [];
        for (const peer of peers) {
            const notificationId = await ConsumptionIds.notification.generate();
            const notification = Notification.from({ id: notificationId, items: [notificationItem] });

            await this.messageController.sendMessage({ recipients: [peer], content: notification });

            notificationIds.push(notificationId.toString());
        }

        return notificationIds;
    }
}
