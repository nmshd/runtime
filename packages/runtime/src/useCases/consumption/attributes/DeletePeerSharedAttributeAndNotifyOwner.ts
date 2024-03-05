import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerSharedAttributeAndNotifyOwnerRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeletePeerSharedAttributeAndNotifyOwnerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerSharedAttributeAndNotifyOwnerRequest"));
    }
}

export class DeletePeerSharedAttributeAndNotifyOwnerUseCase extends UseCase<DeletePeerSharedAttributeAndNotifyOwnerRequest, Notification> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerSharedAttributeAndNotifyOwnerRequest): Promise<Result<Notification>> {
        const peerSharedAttributeId = CoreId.from(request.attributeId);
        const peerSharedAttribute = await this.attributeController.getLocalAttribute(peerSharedAttributeId);

        if (typeof peerSharedAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!peerSharedAttribute.isPeerSharedAttribute(peerSharedAttribute.shareInfo?.peer)) {
            return Result.fail(RuntimeErrors.attributes.isNotPeerSharedAttribute(peerSharedAttributeId));
        }

        const predecessors = await this.attributeController.getPredecessorsOfAttribute(peerSharedAttributeId);
        for (const predecessor of predecessors) {
            await this.attributeController.deleteAttribute(predecessor);
        }

        await this.attributeController.deleteAttribute(peerSharedAttribute);

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = PeerSharedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerSharedAttributeId });
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
