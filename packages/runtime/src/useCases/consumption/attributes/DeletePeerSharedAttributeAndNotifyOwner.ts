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

        if (typeof peerSharedAttribute.succeededBy !== "undefined") {
            const successor = await this.attributeController.getLocalAttribute(peerSharedAttribute.succeededBy);
            if (typeof successor === "undefined") {
                throw new Error(`The Attribute ${peerSharedAttribute.succeededBy} was not found, even though it is specified as successor of Attribute ${peerSharedAttribute.id}.`);
            }

            successor.succeeds = undefined;
            await this.attributeController.updateAttributeUnsafe(successor);
        }

        const predecessors = await this.attributeController.getPredecessorsOfAttribute(peerSharedAttributeId);

        for (const attr of [peerSharedAttribute, ...predecessors]) {
            await this.attributeController.deleteAttribute(attr);
        }

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
