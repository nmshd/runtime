import { ILogger } from "@js-soft/logging-abstractions";
import { ApplicationError } from "@js-soft/ts-utils";
import { ForwardedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    ForwardedAttributeDeletedByPeerEvent,
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionStatus,
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
            return ValidationResult.error(new ApplicationError("", "")); // TODO:
            // return ValidationResult.error(ConsumptionCoreErrors.attributes.isNotOwnSharedAttribute(notificationItem.attributeId));
        }

        if (!attribute.isSharedWith(notification.peer)) {
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
            throw Error; // TODO:
        }

        const deletionInfo = ForwardedAttributeDeletionInfo.from({
            deletionStatus: ForwardedAttributeDeletionStatus.DeletedByPeer,
            deletionDate: CoreDate.utc()
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        const attributes = [attribute, ...predecessors];

        await this.consumptionController.attributes.setForwardedDeletionInfo(attributes, deletionInfo, notification.peer, true);

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
