import { ILogger } from "@js-soft/logging-abstractions";
import { OwnAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    OwnAttributeDeletedByOwnerEvent,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class OwnAttributeDeletedByOwnerNotificationItemProcessor extends AbstractNotificationItemProcessor<OwnAttributeDeletedByOwnerNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(OwnAttributeDeletedByOwnerNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: OwnAttributeDeletedByOwnerNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return ValidationResult.success();

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.attributeId} is not a PeerIdentityAttribute, a PeerRelationshipAttribute or a ThirdPartyRelationshipAttribute.`
                )
            );
        }

        if (!notification.peer.equals(attribute.peerSharingInfo.peer)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.senderIsNotPeerOfSharedAttribute(notification.peer, notificationItem.attributeId));
        }

        return ValidationResult.success();
    }

    public override async process(notificationItem: OwnAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<OwnAttributeDeletedByOwnerEvent | void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                `The Attribute ${notificationItem.attributeId} is not a PeerIdentityAttribute, a PeerRelationshipAttribute or a ThirdPartyRelationshipAttribute.`
            );
        }

        if (attribute.isToBeDeleted()) return;

        if (attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute) {
            const deletionInfo = ReceivedAttributeDeletionInfo.from({
                deletionStatus: ReceivedAttributeDeletionStatus.DeletedByOwner,
                deletionDate: CoreDate.utc()
            });

            await this.consumptionController.attributes.setPeerDeletionInfoOfPeerAttributeAndPredecessors(attribute, deletionInfo);

            return new OwnAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
        }

        const deletionInfo = ThirdPartyRelationshipAttributeDeletionInfo.from({
            deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner,
            deletionDate: CoreDate.utc()
        });

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttributeAndPredecessors(attribute, deletionInfo);

        return new OwnAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: OwnAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (!attribute) return;

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) return;

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        for (const attr of [attribute, ...predecessors]) {
            if (attr.isToBeDeleted()) continue;

            attr.peerSharingInfo.deletionInfo = undefined;
            await this.consumptionController.attributes.updateAttributeUnsafe(attr);
        }
    }
}
