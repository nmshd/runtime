import { ILogger } from "@js-soft/logging-abstractions";
import { PeerRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    OwnRelationshipAttribute,
    PeerRelationshipAttributeDeletedByPeerEvent,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor extends AbstractNotificationItemProcessor<PeerRelationshipAttributeDeletedByPeerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: PeerRelationshipAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return ValidationResult.success();

        if (!(attribute instanceof OwnRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.attributeId} is not an own RelationshipAttribute or ThirdPartyRelationshipAttribute.`
                )
            );
        }

        if (!notification.peer.equals(attribute.peerSharingInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: PeerRelationshipAttributeDeletedByPeerNotificationItem,
        _notification: LocalNotification
    ): Promise<PeerRelationshipAttributeDeletedByPeerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                `The Attribute ${notificationItem.attributeId} is not an own RelationshipAttribute or ThirdPartyRelationshipAttribute.`
            );
        }

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        const attributes = [attribute, ...predecessors];

        if (attribute instanceof OwnRelationshipAttribute) {
            const deletionInfo = EmittedAttributeDeletionInfo.from({
                deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                deletionDate: CoreDate.utc()
            });

            await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttribute(attributes as OwnRelationshipAttribute[], deletionInfo, true);

            return new PeerRelationshipAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
        }

        const deletionInfo = ThirdPartyRelationshipAttributeDeletionInfo.from({
            deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer,
            deletionDate: CoreDate.utc()
        });

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(attributes as ThirdPartyRelationshipAttribute[], deletionInfo, true);

        return new PeerRelationshipAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: PeerRelationshipAttributeDeletedByPeerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
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
