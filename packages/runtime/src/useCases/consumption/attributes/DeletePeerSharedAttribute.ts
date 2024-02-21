import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute, NotificationsController } from "@nmshd/consumption";
import { AttributeDeletedNotificationItem, Notification } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerSharedAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeletePeerSharedAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerSharedAttributeRequest"));
    }
}

export class DeletePeerSharedAttributeUseCase extends UseCase<DeletePeerSharedAttributeRequest, Notification> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject private readonly notificationsController: NotificationsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerSharedAttributeRequest): Promise<Result<Notification>> {
        const peerSharedAttributeId = CoreId.from(request.attributeId);
        const peerSharedAttribute = await this.attributeController.getLocalAttribute(peerSharedAttributeId);

        if (typeof peerSharedAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!peerSharedAttribute.isPeerSharedAttribute(peerSharedAttribute.shareInfo?.peer)) {
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

        return Result.ok(notification);
    }
}
