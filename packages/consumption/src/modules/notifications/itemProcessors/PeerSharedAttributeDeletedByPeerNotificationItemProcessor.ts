import { ILogger } from "@js-soft/logging-abstractions";
import { PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { CoreErrors } from "../../../consumption/CoreErrors";
import { PeerSharedAttributeDeletedByPeerEvent } from "../../attributes";
import { DeletionStatus, LocalAttributeDeletionInfo } from "../../attributes/local/LocalAttributeDeletionInfo";
import { ValidationResult } from "../../common";
import { LocalNotification } from "../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "./AbstractNotificationItemProcessor";

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

        if (typeof attribute === "undefined") {
            return ValidationResult.success();
        }

        if (!attribute.isOwnSharedAttribute(this.currentIdentityAddress)) {
            return ValidationResult.error(CoreErrors.attributes.isNotOwnSharedAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.shareInfo.peer)) {
            // TODO: make this a notification error
            return ValidationResult.error(CoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    // TODO: add deletion of predecessors
    public override async process(
        notificationItem: PeerSharedAttributeDeletedByPeerNotificationItem,
        _notification: LocalNotification
    ): Promise<PeerSharedAttributeDeletedByPeerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") return;

        const deletionStatus = LocalAttributeDeletionInfo.from({
            deletionStatus: DeletionStatus.DeletedByPeer,
            deletionDate: CoreDate.utc()
        });
        attribute.deletionInfo = deletionStatus;

        const updatedAttribute = await this.consumptionController.attributes.updateAttributeUnsafe(attribute);

        return new PeerSharedAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), updatedAttribute);
    }

    public override async rollback(notificationItem: PeerSharedAttributeDeletedByPeerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") return;

        // TODO: the status before might have been 'toBeDeletedByPeer', but I don't think we can save it between process and rollback
        attribute.deletionInfo = undefined;

        await this.consumptionController.attributes.updateAttributeUnsafe(attribute);
    }
}
