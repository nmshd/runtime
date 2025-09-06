import { ILogger } from "@js-soft/logging-abstractions";
import { IdentityAttribute, PeerSharedAttributeSucceededNotificationItem } from "@nmshd/content";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttribute, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class PeerSharedAttributeSucceededNotificationItemProcessor extends AbstractNotificationItemProcessor<PeerSharedAttributeSucceededNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(PeerSharedAttributeSucceededNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: PeerSharedAttributeSucceededNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        if (!notification.peer.equals(notificationItem.successorContent.owner)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionPeerIsNotOwner());
        }

        const successorParams = {
            id: notificationItem.successorId,
            content: notificationItem.successorContent,
            shareInfo: { notificationReference: notification.id, peer: notification.peer }
        };

        if (notificationItem.successorContent instanceof IdentityAttribute) {
            const validationResult = await this.consumptionController.attributes.validatePeerSharedIdentityAttributeSuccession(notificationItem.predecessorId, successorParams);
            return validationResult;
        }

        const validationResult = await this.consumptionController.attributes.validatePeerSharedRelationshipAttributeSuccession(notificationItem.predecessorId, successorParams);
        return validationResult;
    }

    public override async process(notificationItem: PeerSharedAttributeSucceededNotificationItem, notification: LocalNotification): Promise<PeerSharedAttributeSucceededEvent> {
        const successorParams = {
            id: notificationItem.successorId,
            content: notificationItem.successorContent,
            shareInfo: { notificationReference: notification.id, peer: notification.peer }
        };

        let predecessor: LocalAttribute;
        let successor: LocalAttribute;
        try {
            if (notificationItem.successorContent instanceof IdentityAttribute) {
                ({ predecessor, successor } = await this.consumptionController.attributes.succeedPeerSharedIdentityAttribute(
                    notificationItem.predecessorId,
                    successorParams,
                    false
                ));
            } else {
                ({ predecessor, successor } = await this.consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                    notificationItem.predecessorId,
                    successorParams,
                    false
                ));
            }
        } catch (e: unknown) {
            await this.rollbackPartialWork(notificationItem, notification).catch((e) =>
                this._logger.error(`Rollback failed for notification item (notification id: ${notification.id}).`, e)
            );
            throw e;
        }

        const ownAddress = this.consumptionController.accountController.identity.address.toString();
        return new PeerSharedAttributeSucceededEvent(ownAddress, predecessor, successor);
    }

    public override async rollback(notificationItem: PeerSharedAttributeSucceededNotificationItem, notification: LocalNotification): Promise<void> {
        await this.rollbackPartialWork(notificationItem, notification);
    }

    private async rollbackPartialWork(notificationItem: PeerSharedAttributeSucceededNotificationItem, _notification: LocalNotification): Promise<void> {
        const successor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.successorId);
        if (successor) {
            await this.consumptionController.attributes
                .deleteAttributeUnsafe(successor.id)
                .catch((e) => this._logger.error(`Deletion failed for attribute (attribute id: ${successor.id}).`, e));
        }

        const predecessor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        if (predecessor?.succeededBy) {
            predecessor.succeededBy = undefined;
            await this.consumptionController.attributes
                .updateAttributeUnsafe(predecessor)
                .catch((e) => this._logger.error(`Update failed for attribute (attribute id: ${notificationItem.predecessorId}).`, e));
        }
    }
}
