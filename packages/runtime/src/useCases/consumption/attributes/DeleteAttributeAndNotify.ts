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
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";

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

    protected async executeInternal(request: DeleteAttributeAndNotifyRequest): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(attribute.id);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        const peersOfAttributeResult = await this.getPeersOfAttributeToNotify(attribute);
        if (peersOfAttributeResult.isError) return Result.fail(peersOfAttributeResult.error);

        const peersOfOnlyPredecessorResult = await this.getPeersOfPredecessorsToNotify(attribute);
        if (peersOfOnlyPredecessorResult.isError) return Result.fail(peersOfOnlyPredecessorResult.error);

        await this.attributesController.executeFullAttributeDeletionProcess(attribute);

        const notificationIds = await this.notifyPeers(attribute, peersOfAttributeResult.value, peersOfOnlyPredecessorResult.value);

        await this.accountController.syncDatawallet();

        return Result.ok({ notificationIds });
    }

    private async getPeersOfAttributeToNotify(attribute: LocalAttribute): Promise<Result<CoreAddress[]>> {
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
        const forwardingPeers = await this.attributesController.getForwardingPeers(attribute, true);
        if (forwardingPeers.length === 0) return Result.ok([]);

        const queryForRelationshipsToNotify = {
            "peer.address": { $in: forwardingPeers.map((peer) => peer.toString()) },
            status: { $in: [RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated] },
            "peerDeletionInfo.deletionStatus": { $ne: PeerDeletionStatus.Deleted }
        };
        const relationshipsToNotify = await this.relationshipsController.getRelationships(queryForRelationshipsToNotify);
        if (relationshipsToNotify.length === 0) return Result.ok([]);

        if (relationshipsToNotify.some((relationship) => relationship.status === RelationshipStatus.Pending)) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending(attribute.id));
        }

        const peersToNotify = relationshipsToNotify.map((relationship) => relationship.peer.address);
        return Result.ok(peersToNotify);
    }

    private async getPeerOfAttribute(
        attribute: OwnRelationshipAttribute | PeerRelationshipAttribute | PeerIdentityAttribute | ThirdPartyRelationshipAttribute
    ): Promise<Result<CoreAddress[]>> {
        const relationship = await this.relationshipsController.getRelationshipToIdentity(attribute.peer);
        if (
            !relationship ||
            relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted ||
            ![RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated].includes(relationship.status)
        ) {
            return Result.ok([]);
        }

        if (relationship.status === RelationshipStatus.Pending) {
            return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending(attribute.id));
        }

        return Result.ok([attribute.peer]);
    }

    private async getPeersOfPredecessorsToNotify(attribute: LocalAttribute): Promise<Result<[CoreAddress, CoreId][]>> {
        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return Result.ok([]);
        }

        const peersWithPredecessors = await this.attributesController.getPeersWithExclusivelyForwardedPredecessors(attribute.id);
        if (peersWithPredecessors.length === 0) return Result.ok([]);

        const peersWithPredecessorsToNotify: [CoreAddress, CoreId][] = [];
        for (const [peer, attributeId] of peersWithPredecessors) {
            const relationship = await this.relationshipsController.getRelationshipToIdentity(peer);
            if (
                !relationship ||
                relationship.peerDeletionInfo?.deletionStatus === PeerDeletionStatus.Deleted ||
                ![RelationshipStatus.Pending, RelationshipStatus.Active, RelationshipStatus.Terminated].includes(relationship.status)
            ) {
                continue;
            }

            if (relationship.status === RelationshipStatus.Pending) {
                return Result.fail(RuntimeErrors.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending(attributeId));
            }

            peersWithPredecessorsToNotify.push([peer, attributeId]);
        }

        return Result.ok(peersWithPredecessorsToNotify);
    }

    private async notifyPeers(attribute: LocalAttribute, peersOfAttribute: CoreAddress[], peersOfPredecessors: [CoreAddress, CoreId][]): Promise<string[]> {
        const notificationIdsOfAttribute = await this.notifyPeersOfAttribute(attribute, peersOfAttribute);
        const notificationIdsOfPredecessors = await this.notifyPeersOfPredecessors(attribute, peersOfPredecessors);

        return [...notificationIdsOfAttribute, ...notificationIdsOfPredecessors];
    }

    private async notifyPeersOfAttribute(attribute: LocalAttribute, peers: CoreAddress[]): Promise<string[]> {
        if (peers.length === 0) return [];

        const notificationItem = this.createAttributeDeletedNotificationItem(attribute);

        const notificationIdsOfAttribute = [];
        for (const peer of peers) {
            const notificationId = await this.sendNotification(peer, notificationItem);
            notificationIdsOfAttribute.push(notificationId);
        }

        return notificationIdsOfAttribute;
    }

    private async notifyPeersOfPredecessors(attribute: LocalAttribute, peersOfPredecessors: [CoreAddress, CoreId][]): Promise<string[]> {
        if (peersOfPredecessors.length === 0) return [];

        const notificationIdsOfPredecessors = [];
        for (const [peer, predecessorId] of peersOfPredecessors) {
            const notificationItem = this.createAttributeDeletedNotificationItem(attribute, predecessorId);
            const notificationId = await this.sendNotification(peer, notificationItem);
            notificationIdsOfPredecessors.push(notificationId);
        }

        return notificationIdsOfPredecessors;
    }

    private createAttributeDeletedNotificationItem(
        attribute: LocalAttribute,
        predecessorId?: CoreId
    ): OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedByPeerNotificationItem {
        const attributeType = (attribute.constructor as any).name;
        switch (attributeType) {
            case OwnIdentityAttribute.name:
            case OwnRelationshipAttribute.name:
                return OwnAttributeDeletedByOwnerNotificationItem.from({ attributeId: predecessorId ?? attribute.id });
            case PeerRelationshipAttribute.name:
                return PeerRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: predecessorId ?? attribute.id });
            case PeerIdentityAttribute.name:
            case ThirdPartyRelationshipAttribute.name:
                return ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: predecessorId ?? attribute.id });
            default:
                throw new Error("Type of LocalAttribute not found.");
        }
    }

    private async sendNotification(
        peer: CoreAddress,
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem | PeerRelationshipAttributeDeletedByPeerNotificationItem | ForwardedAttributeDeletedByPeerNotificationItem
    ): Promise<string> {
        const notificationId = await ConsumptionIds.notification.generate();
        const notification = Notification.from({ id: notificationId, items: [notificationItem] });

        await this.messageController.sendMessage({ recipients: [peer], content: notification });

        return notificationId.toString();
    }
}
