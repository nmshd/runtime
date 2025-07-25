import { ILogger } from "@js-soft/logging-abstractions";
import { ApplicationError } from "@js-soft/ts-utils";
import { PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionStatus,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerRelationshipAttribute,
    PeerSharedAttributeDeletedByPeerEvent,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class PeerSharedAttributeDeletedByPeerNotificationItemProcessor extends AbstractNotificationItemProcessor<PeerSharedAttributeDeletedByPeerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(PeerSharedAttributeDeletedByPeerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: PeerSharedAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return ValidationResult.success();

        if (
            !(
                attribute instanceof OwnIdentityAttribute ||
                attribute instanceof OwnRelationshipAttribute ||
                attribute instanceof PeerRelationshipAttribute ||
                attribute instanceof ThirdPartyRelationshipAttribute
            )
        ) {
            return ValidationResult.error(new ApplicationError("", "")); // TODO:
            // return ValidationResult.error(ConsumptionCoreErrors.attributes.isNotOwnSharedAttribute(notificationItem.attributeId));
        }

        const senderIsPeerOfRelationshipAttribute =
            (attribute instanceof OwnRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute) && !notification.peer.equals(attribute.peerSharingInfo.peer);
        const attributeIsSharedWithSender =
            (attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute) &&
            attribute.isSharedWith(notification.peer);
        if (!(senderIsPeerOfRelationshipAttribute || attributeIsSharedWithSender)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: PeerSharedAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<PeerSharedAttributeDeletedByPeerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (
            !(
                attribute instanceof OwnIdentityAttribute ||
                attribute instanceof OwnRelationshipAttribute ||
                attribute instanceof PeerRelationshipAttribute ||
                attribute instanceof ThirdPartyRelationshipAttribute
            )
        ) {
            throw Error; // TODO:
        }

        if (attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute) {
            const deletionInfo = ForwardedAttributeDeletionInfo.from({
                deletionStatus: ForwardedAttributeDeletionStatus.DeletedByPeer,
                deletionDate: CoreDate.utc()
            });

            const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
            const attributes = [attribute, ...predecessors];

            const senderIsPeerOfOwnRelationshipAttribute = attribute instanceof OwnRelationshipAttribute && notification.peer.equals(attribute.peerSharingInfo.peer);
            if (senderIsPeerOfOwnRelationshipAttribute) {
                await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttribute(attributes as OwnRelationshipAttribute[], deletionInfo, true);
            } else {
                await this.consumptionController.attributes.setForwardedDeletionInfo(attributes, deletionInfo, notification.peer, true);
            }

            return new PeerSharedAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
        }

        const deletionInfo = ThirdPartyRelationshipAttributeDeletionInfo.from({
            deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer,
            deletionDate: CoreDate.utc()
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        const attributes = [attribute, ...predecessors];

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(attributes, deletionInfo, true);

        return new PeerSharedAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: PeerSharedAttributeDeletedByPeerNotificationItem, notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (
            !(
                attribute instanceof OwnIdentityAttribute ||
                attribute instanceof OwnRelationshipAttribute ||
                attribute instanceof PeerRelationshipAttribute ||
                attribute instanceof ThirdPartyRelationshipAttribute
            )
        ) {
            return;
        }

        const senderIsPeerOfOwnRelationshipAttribute = attribute instanceof OwnRelationshipAttribute && notification.peer.equals(attribute.peerSharingInfo.peer);
        if (attribute instanceof OwnIdentityAttribute || attribute instanceof PeerRelationshipAttribute || senderIsPeerOfOwnRelationshipAttribute) {
            const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
            for (const attr of [attribute, ...predecessors]) {
                // the previous deletionState cannot be unambiguously known, either it was undefined or 'ToBeDeletedByPeer'
                attr.setForwardedDeletionInfo(undefined, notification.peer);
                await this.consumptionController.attributes.updateAttributeUnsafe(attr);
            }
            return;
        }

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        for (const attr of [attribute, ...predecessors]) {
            // the previous deletionState cannot be unambiguously known, either it was undefined or 'ToBeDeletedByPeer'
            attr.setPeerDeletionInfo(undefined);
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
