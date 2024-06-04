import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { Notification, PeerSharedAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerSharedAttributeAndNotifyOwnerRequest {
    attributeId: AttributeIdString;
}

export interface DeletePeerSharedAttributeAndNotifyOwnerResponse {
    notificationId: NotificationIdString;
}

class Validator extends SchemaValidator<DeletePeerSharedAttributeAndNotifyOwnerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerSharedAttributeAndNotifyOwnerRequest"));
    }
}

export class DeletePeerSharedAttributeAndNotifyOwnerUseCase extends UseCase<DeletePeerSharedAttributeAndNotifyOwnerRequest, DeletePeerSharedAttributeAndNotifyOwnerResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerSharedAttributeAndNotifyOwnerRequest): Promise<Result<DeletePeerSharedAttributeAndNotifyOwnerResponse>> {
        const peerSharedAttributeId = CoreId.from(request.attributeId);
        const peerSharedAttribute = await this.attributesController.getLocalAttribute(peerSharedAttributeId);
        if (!peerSharedAttribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        if (!peerSharedAttribute.isPeerSharedAttribute(peerSharedAttribute.shareInfo?.peer)) {
            return Result.fail(RuntimeErrors.attributes.isNotPeerSharedAttribute(peerSharedAttributeId));
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(peerSharedAttribute);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        await this.attributesController.executeFullAttributeDeletionProcess(peerSharedAttribute);

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

        const result = { notificationId: notificationId.toString() };
        return Result.ok(result);
    }
}
