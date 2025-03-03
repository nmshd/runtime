import { ILogger } from "@js-soft/logging-abstractions";
import { OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttributeDeletionInfo, LocalAttributeDeletionStatus, OwnSharedAttributeDeletedByOwnerEvent } from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

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

        if (!attribute) return ValidationResult.success();

        if (!attribute.isPeerSharedAttribute()) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.isNotPeerSharedAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.shareInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem,
        _notification: LocalNotification
    ): Promise<OwnSharedAttributeDeletedByOwnerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: LocalAttributeDeletionStatus.DeletedByOwner,
            deletionDate: CoreDate.utc()
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);

        for (const attr of [attribute, ...predecessors]) {
            if (!attr.deletionInfo) {
                attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
                await this.consumptionController.attributes.updateAttributeUnsafe(attr);
            }
        }

        return new OwnSharedAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);
        for (const attr of [attribute, ...predecessors]) {
            attr.deletionInfo = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
