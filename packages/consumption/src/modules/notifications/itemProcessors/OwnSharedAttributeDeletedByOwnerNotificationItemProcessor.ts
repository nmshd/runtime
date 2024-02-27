import { ILogger } from "@js-soft/logging-abstractions";
import { OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreDate, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { CoreErrors } from "../../../consumption/CoreErrors";
import { OwnSharedAttributeDeletedByOwnerEvent } from "../../attributes";
import { DeletionStatus, LocalAttributeDeletionStatus } from "../../attributes/local/LocalAttributeDeletionStatus";
import { ValidationResult } from "../../common";
import { LocalNotification } from "../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "./AbstractNotificationItemProcessor";

export class OwnSharedAttributeDeletedByOwnerNotificationItemProcessor extends AbstractNotificationItemProcessor<OwnSharedAttributeDeletedByOwnerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(OwnSharedAttributeDeletedByOwnerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);

        if (typeof attribute === "undefined") {
            return ValidationResult.success();
        }

        if (!attribute.isPeerSharedAttribute()) {
            return ValidationResult.error(CoreErrors.attributes.isNotPeerSharedAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem,
        _notification: LocalNotification
    ): Promise<OwnSharedAttributeDeletedByOwnerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") return;

        const deletionStatus = LocalAttributeDeletionStatus.from({
            status: DeletionStatus.DeletedByOwner,
            deletionDate: CoreDate.utc()
        });

        let updatedAttribute = attribute;
        if (typeof attribute.deletionStatus === "undefined") {
            attribute.deletionStatus = deletionStatus;
            updatedAttribute = await this.consumptionController.attributes.updateAttributeUnsafe(attribute);
        }

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const predecessor of predecessors) {
            if (typeof predecessor.deletionStatus === "undefined") {
                predecessor.deletionStatus = deletionStatus;
                await this.consumptionController.attributes.updateAttributeUnsafe(predecessor);
            }
        }

        return new OwnSharedAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), updatedAttribute);
    }

    public override async rollback(notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") return;

        attribute.deletionStatus = undefined;
        await this.consumptionController.attributes.updateAttributeUnsafe(attribute);

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const predecessor of predecessors) {
            predecessor.deletionStatus = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(predecessor);
        }
    }
}
