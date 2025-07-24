import { ILogger } from "@js-soft/logging-abstractions";
import { ApplicationError } from "@js-soft/ts-utils";
import { OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    OwnSharedAttributeDeletedByOwnerEvent,
    PeerAttributeDeletionInfo,
    PeerAttributeDeletionStatus,
    PeerIdentityAttribute,
    PeerRelationshipAttribute
} from "../../../attributes";
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

        if (!attribute) return ValidationResult.success(); // TODO: why is this success? Shouldn't it be an error?

        // TODO: think about ThirdPartyRelationshipAttributes
        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(new ApplicationError("", "")); // TODO:
            // return ValidationResult.error(ConsumptionCoreErrors.attributes.isNotPeerSharedAttribute(notificationItem.attributeId));
        }

        if (!notification.peer.equals(attribute.peerSharingInfo.peer)) {
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

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute)) {
            throw Error; // TODO:
        }

        const deletionInfo = PeerAttributeDeletionInfo.from({
            deletionStatus: PeerAttributeDeletionStatus.DeletedByOwner,
            deletionDate: CoreDate.utc()
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);

        for (const attr of [attribute, ...predecessors]) {
            if (!attr.peerSharingInfo.deletionInfo) {
                attr.setPeerDeletionInfo(deletionInfo);
                await this.consumptionController.attributes.updateAttributeUnsafe(attr);
            }
        }

        return new OwnSharedAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: OwnSharedAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute)) return;

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        for (const attr of [attribute, ...predecessors]) {
            attr.peerSharingInfo.deletionInfo = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
