import { ILogger } from "@js-soft/logging-abstractions";
import { AttributeDeletedNotificationItem } from "@nmshd/content";
import { CoreDate, CoreErrors as TransportCoreErrors, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { CoreErrors } from "../../../../consumption/CoreErrors";
import { AttributeDeletedByPeerEvent, ILocalAttribute, LocalAttribute } from "../../../attributes";
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

    // TODO: add deletion of predecessors
    public override async process(notificationItem: AttributeDeletedNotificationItem, notification: LocalNotification): Promise<AttributeDeletedByPeerEvent> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, notificationItem.attributeId.toString());
        }

        // TODO: improve
        const params: ILocalAttribute = {
            // ...attribute,
            id: attribute.id,
            content: attribute.content,
            createdAt: attribute.createdAt,
            parentId: attribute.parentId,
            shareInfo: attribute.shareInfo,
            succeededBy: attribute.succeededBy,
            succeeds: attribute.succeeds,
            deletionStatus: {
                // ...attribute.deletionStatus,
                toBeDeletedAt: attribute.deletionStatus?.toBeDeletedAt,
                toBeDeletedByPeerAt: attribute.deletionStatus?.toBeDeletedByPeerAt,
                deletedByPeer: CoreDate.utc()
            }
        };
        const updatedAttribute = await this.consumptionController.attributes.updateAttributeUnsafe(params);

        return new AttributeDeletedByPeerEvent(this.currentIdentityAddress.toString(), updatedAttribute);
    }

    public override async rollback(notificationItem: AttributeDeletedNotificationItem, notification: LocalNotification): Promise<void> {
        const attribute = await this.consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        if (typeof attribute === "undefined") {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, notificationItem.attributeId.toString());
        }

        // TODO: adjust like above
        const params: ILocalAttribute = {
            ...attribute,
            deletionStatus: {
                ...attribute.deletionStatus,
                deletedByPeer: undefined
            }
        };
        await this.consumptionController.attributes.updateAttributeUnsafe(params);
    }
}
