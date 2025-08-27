import { ILogger } from "@js-soft/logging-abstractions";
import { IdentityAttribute, PeerAttributeSucceededNotificationItem, RelationshipAttribute } from "@nmshd/content";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { AttributeSucceededEvent, LocalAttribute, PeerIdentityAttribute, PeerIdentityAttributeSuccessorParams, PeerRelationshipAttribute } from "../../../attributes";
import { PeerRelationshipAttributeSuccessorParams } from "../../../attributes/local/successorParams/PeerRelationshipAttributeSuccessorParams";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

// TODO: naming with Received?
export class PeerAttributeSucceededNotificationItemProcessor extends AbstractNotificationItemProcessor<PeerAttributeSucceededNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(PeerAttributeSucceededNotificationItemProcessor);
    }

    public override async checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: PeerAttributeSucceededNotificationItem,
        notification: LocalNotification
    ): Promise<ValidationResult> {
        if (!notification.peer.equals(notificationItem.successorContent.owner)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionPeerIsNotOwner());
        }

        const predecessor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        if (!predecessor) return ValidationResult.error(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());

        // TODO: this wasn't implemented for ThirdPartyRelationshipAttributes so far
        if (!(predecessor instanceof PeerIdentityAttribute || predecessor instanceof PeerRelationshipAttribute)) {
            return ValidationResult.error(
                ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.predecessorId} is not a peer IdentityAttribute or peer RelationshipAttribute.`
                )
            );
        }

        if (predecessor instanceof PeerIdentityAttribute) {
            if (!(notificationItem.successorContent instanceof IdentityAttribute)) {
                return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeContentType());
            }

            const successorParams = PeerIdentityAttributeSuccessorParams.from({
                id: notificationItem.successorId,
                content: notificationItem.successorContent,
                peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
            });
            return await this.consumptionController.attributes.validatePeerIdentityAttributeSuccession(predecessor, successorParams);
        }

        if (!(notificationItem.successorContent instanceof RelationshipAttribute)) {
            return ValidationResult.error(ConsumptionCoreErrors.attributes.successionMustNotChangeContentType());
        }

        // if (predecessor instanceof PeerRelationshipAttribute) {
        const successorParams = PeerRelationshipAttributeSuccessorParams.from({
            id: notificationItem.successorId,
            content: notificationItem.successorContent,
            peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
        });
        return await this.consumptionController.attributes.validatePeerRelationshipAttributeSuccession(predecessor, successorParams);
        // }

        // TODO: evaluate if this should be implemented for ThirdPartyRelationshipAttributes now
        // const successorParams = {
        //     id: notificationItem.successorId,
        //     content: notificationItem.successorContent,
        //     sharingInfo: { sourceReference: notification.id, peer: notification.peer }
        // };
        // return await this.consumptionController.attributes.validateThirdPartyRelationshipAttributeSuccession(predecessor, successorParams);
    }

    public override async process(notificationItem: PeerAttributeSucceededNotificationItem, notification: LocalNotification): Promise<AttributeSucceededEvent> {
        let updatedPredecessor: LocalAttribute;
        let successor: LocalAttribute;

        try {
            const predecessor = await this.consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
            if (!predecessor) throw ConsumptionCoreErrors.attributes.predecessorDoesNotExist();

            if (!(predecessor instanceof PeerIdentityAttribute || predecessor instanceof PeerRelationshipAttribute)) {
                throw ConsumptionCoreErrors.attributes.wrongTypeOfAttribute(
                    `The Attribute ${notificationItem.predecessorId} is not a peer IdentityAttribute or peer RelationshipAttribute.`
                );
            }

            if (predecessor instanceof PeerIdentityAttribute) {
                const successorParams = PeerIdentityAttributeSuccessorParams.from({
                    id: notificationItem.successorId,
                    content: notificationItem.successorContent as IdentityAttribute,
                    peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
                });

                const attributesAfterSuccession = await this.consumptionController.attributes.succeedPeerIdentityAttribute(predecessor, successorParams, false);
                ({ predecessor: updatedPredecessor, successor } = attributesAfterSuccession);
            } else {
                const successorParams = PeerRelationshipAttributeSuccessorParams.from({
                    id: notificationItem.successorId,
                    content: notificationItem.successorContent as RelationshipAttribute,
                    peerSharingInfo: { sourceReference: notification.id, peer: notification.peer }
                });

                const attributesAfterSuccession = await this.consumptionController.attributes.succeedPeerRelationshipAttribute(predecessor, successorParams, false);
                ({ predecessor: updatedPredecessor, successor } = attributesAfterSuccession);
            }
        } catch (e: unknown) {
            await this.rollbackPartialWork(notificationItem, notification).catch((e) =>
                this._logger.error(`Rollback failed for notification item (notification id: ${notification.id}).`, e)
            );
            throw e;
        }

        const ownAddress = this.accountController.identity.address.toString();
        return new AttributeSucceededEvent(ownAddress, updatedPredecessor, successor);
    }

    public override async rollback(notificationItem: PeerAttributeSucceededNotificationItem, notification: LocalNotification): Promise<void> {
        await this.rollbackPartialWork(notificationItem, notification);
    }

    private async rollbackPartialWork(notificationItem: PeerAttributeSucceededNotificationItem, _notification: LocalNotification): Promise<void> {
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
