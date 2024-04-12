import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionIds, LocalAttribute } from "@nmshd/consumption";
import { Notification, ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { AccountController, CoreId, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerRequest"));
    }
}

export class DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerUseCase extends UseCase<DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerRequest, Notification> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteThirdPartyOwnedRelationshipAttributeAndNotifyPeerRequest): Promise<Result<Notification>> {
        const thirdPartyOwnedRelationshipAttributeId = CoreId.from(request.attributeId);
        const thirdPartyOwnedRelationshipAttribute = await this.attributesController.getLocalAttribute(thirdPartyOwnedRelationshipAttributeId);

        if (typeof thirdPartyOwnedRelationshipAttribute === "undefined") {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        if (!thirdPartyOwnedRelationshipAttribute.isThirdPartyOwnedAttribute(this.accountController.identity.address)) {
            return Result.fail(RuntimeErrors.attributes.isNotThirdPartyOwnedAttribute(thirdPartyOwnedRelationshipAttributeId));
        }

        const validationResult = await this.attributesController.validateFullAttributeDeletionProcess(thirdPartyOwnedRelationshipAttribute);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        await this.attributesController.executeFullAttributeDeletionProcess(thirdPartyOwnedRelationshipAttribute);

        const notificationId = await ConsumptionIds.notification.generate();
        const notificationItem = ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: thirdPartyOwnedRelationshipAttributeId });
        const notification = Notification.from({
            id: notificationId,
            items: [notificationItem]
        });
        await this.messageController.sendMessage({
            recipients: [thirdPartyOwnedRelationshipAttribute.shareInfo.peer],
            content: notification
        });

        await this.accountController.syncDatawallet();

        return Result.ok(notification);
    }
}
