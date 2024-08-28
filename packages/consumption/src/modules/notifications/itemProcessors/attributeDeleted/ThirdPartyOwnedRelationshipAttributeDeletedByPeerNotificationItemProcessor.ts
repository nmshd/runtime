import { ILogger } from "@js-soft/logging-abstractions";
import { ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent } from "../../../attributes";
import { LocalAttributeDeletionInfo, LocalAttributeDeletionStatus } from "../../../attributes/local/LocalAttributeDeletionInfo";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor extends AbstractNotificationItemProcessor<ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);

        if (!attribute) return ValidationResult.success();

        if (!attribute.isThirdPartyOwnedRelationshipAttribute(this.currentIdentityAddress)) {
            return ValidationResult.error(CoreErrors.attributes.isNotThirdPartyOwnedRelationshipAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(
        notificationItem: ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem,
        _notification: LocalNotification
    ): Promise<ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        const deletionDate = CoreDate.utc();
        const deletionInfo = LocalAttributeDeletionInfo.from({
            deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
            deletionDate: deletionDate
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);

        for (const attr of [attribute, ...predecessors]) {
            attr.setDeletionInfo(deletionInfo, this.accountController.identity.address);
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }

        return new ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute.id);

        for (const attr of [attribute, ...predecessors]) {
            // the previous deletionState cannot be unambiguously known, either it was undefined or 'toBeDeletedByPeer'
            attr.deletionInfo = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
