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
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute
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
                    `The Attribute ${notificationItem.attributeId} is not an OwnRelationshipAttribute or a ThirdPartyRelationshipAttribute.`
                )
            );
        }

        if (!notification.peer.equals(attribute.peerSharingDetails.peer)) {
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
                `The Attribute ${notificationItem.attributeId} is not an OwnRelationshipAttribute or a ThirdPartyRelationshipAttribute.`
            );
        }

        if (attribute instanceof OwnRelationshipAttribute) {
            const deletionInfo = EmittedAttributeDeletionInfo.from({
                deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                deletionDate: CoreDate.utc()
            });

            await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttributeAndPredecessors(attribute, deletionInfo, true);

            return new PeerRelationshipAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
        }

        const deletionInfo = ReceivedAttributeDeletionInfo.from({
            deletionStatus: ReceivedAttributeDeletionStatus.DeletedByEmitter,
            deletionDate: CoreDate.utc()
        });

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttributeAndPredecessors(attribute, deletionInfo, true);

        return new PeerRelationshipAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: PeerRelationshipAttributeDeletedByPeerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            return;
        }

        // the previous deletionState cannot be unambiguously known
        return attribute instanceof OwnRelationshipAttribute
            ? await this.consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttributeAndPredecessors(attribute, undefined, true)
            : await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttributeAndPredecessors(attribute, undefined, true);
    }
}
