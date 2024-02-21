import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, NotificationsController } from "@nmshd/consumption";
import { AttributeDeletedNotificationItem, Notification } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalNotificationDTO } from "../../../types";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { NotificationMapper } from "../notifications/NotificationMapper";

export interface DeletePeerSharedAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeletePeerSharedAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerSharedAttributeRequest"));
    }
}

export class DeletePeerSharedAttributeUseCase extends UseCase<DeletePeerSharedAttributeRequest, LocalNotificationDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly notificationsController: NotificationsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerSharedAttributeRequest): Promise<Result<LocalNotificationDTO>> {
        const peerSharedAttributeId = CoreId.from(request.attributeId);
        const peerSharedAttribute = await this.attributeController.getLocalAttribute(peerSharedAttributeId);

        if (typeof peerSharedAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!peerSharedAttribute.isPeerSharedAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotPeerSharedAttribute(peerSharedAttributeId));
        }

        await this.attributeController.deleteAttribute(peerSharedAttribute);

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = AttributeDeletedNotificationItem.from({ attributeId: peerSharedAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [peerSharedAttribute.shareInfo.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        const localNotification = await this.notificationsController.getNotification(notificationId);
        return Result.ok(NotificationMapper.toNotificationDTO(localNotification));
    }
}
