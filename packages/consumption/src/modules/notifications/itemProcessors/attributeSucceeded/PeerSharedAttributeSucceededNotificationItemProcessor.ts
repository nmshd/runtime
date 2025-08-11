import { ILogger } from "@js-soft/logging-abstractions";
import { ApplicationError } from "@js-soft/ts-utils";
import { IdentityAttribute, PeerSharedAttributeSucceededNotificationItem, RelationshipAttribute } from "@nmshd/content";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { LocalAttribute, PeerIdentityAttribute, PeerIdentityAttributeSuccessorParams, PeerRelationshipAttribute, PeerSharedAttributeSucceededEvent } from "../../../attributes";
import { PeerRelationshipAttributeSuccessorParams } from "../../../attributes/local/successorParams/PeerRelationshipAttributeSuccessorParams";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

// TODO: this needs to be renamed, too
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

        const predecessor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        if (!predecessor) return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());

        // TODO: this wasn't implemented for ThirdPartyRelationshipAttributes so far
        if (!(predecessor instanceof PeerIdentityAttribute || predecessor instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(new ApplicationError("", "")); // TODO:
        }

        if (predecessor instanceof PeerIdentityAttribute) {
            if (!(notificationItem.successorContent instanceof IdentityAttribute)) {
                return ValidationResult.error(new ApplicationError("", "")); // TODO:
            }

            const successorParams = PeerIdentityAttributeSuccessorParams.from({
                id: notificationItem.successorId,
                content: notificationItem.successorContent,
                peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
            });
            return await this.consumptionController.attributes.validatePeerIdentityAttributeSuccession(predecessor.id, successorParams);
        }

        if (!(notificationItem.successorContent instanceof RelationshipAttribute)) {
            return ValidationResult.error(new ApplicationError("", "")); // TODO:
        }

        // if (predecessor instanceof PeerRelationshipAttribute) {
        const successorParams = PeerRelationshipAttributeSuccessorParams.from({
            id: notificationItem.successorId,
            content: notificationItem.successorContent,
            peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
        });
        return await this.consumptionController.attributes.validatePeerRelationshipAttributeSuccession(predecessor.id, successorParams);
        // }

        // TODO: evaluate if this should be implemented for ThirdPartyRelationshipAttributes now
        // const successorParams = {
        //     id: notificationItem.successorId,
        //     content: notificationItem.successorContent,
        //     sharingInfo: { sourceReference: notification.id, peer: notification.peer }
        // };
        // return await this.consumptionController.attributes.validateThirdPartyRelationshipAttributeSuccession(predecessor.id, successorParams);
    }

    public override async process(notificationItem: PeerSharedAttributeSucceededNotificationItem, notification: LocalNotification): Promise<PeerSharedAttributeSucceededEvent> {
        let updatedPredecessor: LocalAttribute | undefined;
        let successor: LocalAttribute | undefined;
        try {
            const predecessor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
            if (!predecessor) throw ConsumptionCoreErrors.attributes.predecessorDoesNotExist();

            if (predecessor instanceof PeerIdentityAttribute && notificationItem.successorContent instanceof IdentityAttribute) {
                const successorParams = PeerIdentityAttributeSuccessorParams.from({
                    id: notificationItem.successorId,
                    content: notificationItem.successorContent,
                    peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
                });
                const attributesAfterSuccession = await this.consumptionController.attributes.succeedPeerIdentityAttribute(predecessor.id, successorParams, false);
                ({ predecessor: updatedPredecessor, successor } = attributesAfterSuccession);
            } else if (predecessor instanceof PeerRelationshipAttribute && notificationItem.successorContent instanceof RelationshipAttribute) {
                const successorParams = PeerRelationshipAttributeSuccessorParams.from({
                    id: notificationItem.successorId,
                    content: notificationItem.successorContent,
                    peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
                });
                const attributesAfterSuccession = await this.consumptionController.attributes.succeedPeerRelationshipAttribute(predecessor.id, successorParams, false);
                ({ predecessor: updatedPredecessor, successor } = attributesAfterSuccession);
            }

            if (!updatedPredecessor || !successor) {
                throw Error; // TODO:
            }
        } catch (e: unknown) {
            await this.rollbackPartialWork(notificationItem, notification).catch((e) =>
                this._logger.error(`Rollback failed for notification item (notification id: ${notification.id}).`, e)
            );
            throw e;
        }

        const ownAddress = this.accountController.identity.address.toString();
        return new PeerSharedAttributeSucceededEvent(ownAddress, updatedPredecessor, successor);
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
