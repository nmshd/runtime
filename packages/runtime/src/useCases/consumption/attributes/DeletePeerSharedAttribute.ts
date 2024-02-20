import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { AttributeDeletedNotificationItem, Notification } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, NotificationIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeletePeerSharedAttributeRequest {
    attributeId: AttributeIdString;
}

export interface DeletePeerSharedAttributeResponse {
    notificationId: NotificationIdString;
}

class Validator extends SchemaValidator<DeletePeerSharedAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeletePeerSharedAttributeRequest"));
    }
}

export class DeletePeerSharedAttributeUseCase extends UseCase<DeletePeerSharedAttributeRequest, DeletePeerSharedAttributeResponse> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeletePeerSharedAttributeRequest): Promise<Result<DeletePeerSharedAttributeResponse>> {
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

        const result = { notificationId: notificationId.toString() };
        return Result.ok(result);
    }
}
