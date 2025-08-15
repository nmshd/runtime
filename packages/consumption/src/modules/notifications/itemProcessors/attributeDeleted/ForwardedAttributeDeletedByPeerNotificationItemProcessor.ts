import { ILogger } from "@js-soft/logging-abstractions";
import { ForwardedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedAttributeDeletedByPeerEvent,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerRelationshipAttribute
} from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

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
                    `The Attribute ${notificationItem.attributeId} is not an own IdentityAttribute, an own RelationshipAttribute or a peer RelationshipAttribute.`
                )
            );
        }

        if (!attribute.isSharedWith(notification.peer, true, true)) {
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
                `The Attribute ${notificationItem.attributeId} is not an own IdentityAttribute, an own RelationshipAttribute or a peer RelationshipAttribute.`
            );
        }

        const deletionInfo = EmittedAttributeDeletionInfo.from({
            deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
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

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        for (const attr of [attribute, ...predecessors]) {
            // the previous deletionState cannot be unambiguously known, either it was undefined or 'ToBeDeletedByPeer'
            attr.setForwardedDeletionInfo(undefined, notification.peer);
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
