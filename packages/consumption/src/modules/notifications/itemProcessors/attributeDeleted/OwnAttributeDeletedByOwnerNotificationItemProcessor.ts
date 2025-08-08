import { ILogger } from "@js-soft/logging-abstractions";
import { OwnAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    OwnAttributeDeletedByOwnerEvent,
    PeerAttributeDeletionInfo,
    PeerAttributeDeletionStatus,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
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

        if (!attribute) return ValidationResult.success(); // TODO: why is this success? Shouldn't it be an error?

        if (!(attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute || attribute instanceof ThirdPartyRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.attributeId} is not a peer IdentityAttribute, peer RelationshipAttribute or ThirdPartyRelationshipAttribute.`
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
                `The Attribute ${notificationItem.attributeId} is not a peer IdentityAttribute, peer RelationshipAttribute or ThirdPartyRelationshipAttribute.`
            );
        }

        if (attribute instanceof PeerIdentityAttribute || attribute instanceof PeerRelationshipAttribute) {
            const deletionInfo = PeerAttributeDeletionInfo.from({
                deletionStatus: PeerAttributeDeletionStatus.DeletedByOwner,
                deletionDate: CoreDate.utc()
            });

            const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
            const attributes = [attribute, ...predecessors];

            await this.consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(attributes, deletionInfo);

            return new OwnAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
        }

        const deletionStatus = attribute.peerIsOwner() ? ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner : ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer;
        const deletionInfo = ThirdPartyRelationshipAttributeDeletionInfo.from({
            deletionStatus,
            deletionDate: CoreDate.utc()
        });

        const predecessors = await this.consumptionController.attributes.getPredecessorsOfAttribute(attribute);
        const attributes = [attribute, ...predecessors];

        await this.consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(attributes, deletionInfo);

        return new OwnAttributeDeletedByOwnerEvent(this.currentIdentityAddress.toString(), attribute);
    }

    public override async rollback(notificationItem: OwnAttributeDeletedByOwnerNotificationItem, _notification: LocalNotification): Promise<void> {
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
