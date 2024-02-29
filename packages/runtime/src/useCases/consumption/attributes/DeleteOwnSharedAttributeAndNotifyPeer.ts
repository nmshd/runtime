import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { Notification, OwnSharedAttributeDeletedByOwnerNotificationItem } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteOwnSharedAttributeAndNotifyPeerRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeleteOwnSharedAttributeAndNotifyPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteOwnSharedAttributeAndNotifyPeerRequest"));
    }
}

export class DeleteOwnSharedAttributeAndNotifyPeerUseCase extends UseCase<DeleteOwnSharedAttributeAndNotifyPeerRequest, Notification> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteOwnSharedAttributeAndNotifyPeerRequest): Promise<Result<Notification>> {
        const ownSharedAttributeId = CoreId.from(request.attributeId);
        const ownSharedAttribute = await this.attributeController.getLocalAttribute(ownSharedAttributeId);

        if (typeof ownSharedAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!ownSharedAttribute.isOwnSharedAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotOwnSharedAttribute(ownSharedAttributeId));
        }

        const predecessors = await this.attributeController.getPredecessorsOfAttribute(ownSharedAttributeId);
        for (const predecessor of predecessors) {
            await this.attributeController.deleteAttribute(predecessor);
        }

        await this.attributeController.deleteAttribute(ownSharedAttribute);

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = OwnSharedAttributeDeletedByOwnerNotificationItem.from({ attributeId: ownSharedAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [ownSharedAttribute.shareInfo.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        return Result.ok(notification);
    }
}
