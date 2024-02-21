import { ILogger } from "@js-soft/logging-abstractions";
import { AttributeDeletedNotificationItem } from "@nmshd/content";
import { CoreErrors as TransportCoreErrors, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { AttributeDeletedByPeerEvent, LocalAttribute } from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class AttributeDeletedNotificationItemProcessor extends AbstractNotificationItemProcessor<AttributeDeletedNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(AttributeDeletedNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: AttributeDeletedNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);

        if (typeof attribute === "undefined") {
            return ValidationResult.error(TransportCoreErrors.general.recordNotFound(LocalAttribute, notificationItem.attributeId.toString()));
        }

        if (!attribute.isOwnSharedAttribute(this.currentIdentityAddress)) {
            return ValidationResult.error(CoreErrors.attributes.isNotOwnSharedAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(notificationItem: AttributeDeletedNotificationItem, notification: LocalNotification): Promise<AttributeDeletedByPeerEvent> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        // TODO: update deletion status deletedByPeer of LocalAttribute

        return new AttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: AttributeDeletedNotificationItem, notification: LocalNotification): Promise<void> {
        // TODO: set deletion status deletedByPeer undefined again
    }
}
