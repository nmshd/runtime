import { ILogger } from "@js-soft/logging-abstractions";
import { ForwardedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController.js";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors.js";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedAttributeDeletedByPeerEvent,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerRelationshipAttribute
} from "../../../attributes/index.js";
import { ValidationResult } from "../../../common/index.js";
import { LocalNotification } from "../../local/LocalNotification.js";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor.js";

export class ForwardedAttributeDeletedByPeerNotificationItemProcessor extends AbstractNotificationItemProcessor<ForwardedAttributeDeletedByPeerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(ForwardedAttributeDeletedByPeerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: ForwardedAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return ValidationResult.success();

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.attributeId} is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute.`
                )
            );
        }

        if (!(await this.consumptionController.attributes.isAttributeForwardedToPeer(attribute, notification.peer))) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: ForwardedAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<ForwardedAttributeDeletedByPeerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                `The Attribute ${notificationItem.attributeId} is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute.`
            );
        }

        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
            deletionDate: CoreDate.utc()
        });

        await this.consumptionController.attributes.setForwardedDeletionInfoOfAttributeAndPredecessors(attribute, deletionInfo, notification.peer, true);

        return new ForwardedAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: ForwardedAttributeDeletedByPeerNotificationItem, notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof OwnIdentityAttribute || attribute instanceof OwnRelationshipAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return;
        }

        // the previous deletionState cannot be unambiguously known
        await this.consumptionController.attributes.setForwardedDeletionInfoOfAttributeAndPredecessors(attribute, undefined, notification.peer, true);
    }
}
